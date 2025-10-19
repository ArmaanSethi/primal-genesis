import Phaser from 'phaser';
import { Client, Room, getStateCallbacks } from 'colyseus.js';

// Use the 'type' keyword to import the server-side schema for type-checking
import type { MyRoomState } from '../../../server/src/rooms/schema/MyRoomState';

export class GameScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: Phaser.GameObjects.Rectangle } = {};
    private enemyEntities: { [sessionId: string]: Phaser.GameObjects.Rectangle } = {};
    private projectileEntities: { [projectileId: string]: Phaser.GameObjects.Rectangle } = {};
    private interactableEntities: { [interactableId: string]: Phaser.GameObjects.GameObject } = {};
    private xpEntities: { [xpId: string]: Phaser.GameObjects.Arc } = {};
    private playerHealthText!: Phaser.GameObjects.Text;
    private pickupMessages: Phaser.GameObjects.Text[] = [];
    private helpText!: Phaser.GameObjects.Text;
    private inventoryText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private stageText!: Phaser.GameObjects.Text;
    private objectiveText!: Phaser.GameObjects.Text;

    // Input keys
    private keyW!: Phaser.Input.Keyboard.Key;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyS!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private keyH!: Phaser.Input.Keyboard.Key; // Toggle help
    private keyE!: Phaser.Input.Keyboard.Key; // Use equipment
    private keySpace!: Phaser.Input.Keyboard.Key; // Dash ability

    // Dash ability properties
    private dashCooldown: number = 0;
    private isDashing: boolean = false;
    private readonly DASH_COOLDOWN_TIME = 6000; // 6 seconds in milliseconds
    private readonly DASH_DURATION = 200; // 0.2 seconds in milliseconds
    private lastDashTime: number = 0;

    private inputPayload = { x: 0, y: 0 };

    constructor() {
        super({ key: 'GameScene' });
    }

    // UI Layout Configuration
    private readonly UI_CONFIG = {
        GAME_WIDTH: 3200,  // Game world size
        GAME_HEIGHT: 2400, // Game world size
        VIEWPORT_WIDTH: window.innerWidth,  // Full browser width
        VIEWPORT_HEIGHT: window.innerHeight, // Full browser height
        LEFT_SIDEBAR_WIDTH: 200,  // Left sidebar for help
        RIGHT_SIDEBAR_WIDTH: 200, // Right sidebar for inventory
        GAME_AREA_WIDTH: 0,       // Will be calculated
        GAME_AREA_HEIGHT: 0       // Will be calculated
    };

    private calculateLayout(): void {
        // Calculate the actual game area dimensions
        this.UI_CONFIG.GAME_AREA_WIDTH = this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.LEFT_SIDEBAR_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH;
        this.UI_CONFIG.GAME_AREA_HEIGHT = this.UI_CONFIG.VIEWPORT_HEIGHT;
    }

    private handleResize(): void {
        // Update viewport dimensions
        this.UI_CONFIG.VIEWPORT_WIDTH = window.innerWidth;
        this.UI_CONFIG.VIEWPORT_HEIGHT = window.innerHeight;

        // Recalculate layout
        this.calculateLayout();

        // Update camera viewport
        this.cameras.main.setViewport(0, 0, this.UI_CONFIG.VIEWPORT_WIDTH, this.UI_CONFIG.VIEWPORT_HEIGHT);

        // Update game scale
        this.game.scale.resize(this.UI_CONFIG.VIEWPORT_WIDTH, this.UI_CONFIG.VIEWPORT_HEIGHT);

        console.log(`Window resized to: ${this.UI_CONFIG.VIEWPORT_WIDTH}x${this.UI_CONFIG.VIEWPORT_HEIGHT}`);
    }

    private createHealthBar(width: number, height: number, color: number): Phaser.GameObjects.Graphics {
        const healthBar = this.add.graphics();
        healthBar.fillStyle(color, 1);
        healthBar.fillRect(0, 0, width, height);
        return healthBar;
    }

    private showPickupMessage(message: string): void {
        console.log(`🎒 PICKUP: ${message}`);

        // Destroy any existing pickup messages to prevent overlap
        this.cleanupOldPickupMessages(true); // Force cleanup all existing messages

        // Create pickup message in the bottom right corner (away from help text)
        const rightSidebarX = this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH + 10;
        const pickupY = this.UI_CONFIG.VIEWPORT_HEIGHT - 100; // Bottom right corner
        const messageText = this.add.text(rightSidebarX, pickupY, message, {
            fontSize: '16px',
            color: '#ffff00',
            fontStyle: 'bold',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: { x: 8, y: 6 },
            wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 1,
                stroke: true,
                fill: true
            }
        }).setOrigin(0).setScrollFactor(0).setDepth(100);

        console.log(`🎒 Created pickup text in bottom right corner at (${rightSidebarX}, ${pickupY})`);

        // Simple approach: Show for 1.5 seconds then destroy
        messageText.setAlpha(1); // Start fully visible

        // Use a single timer - no fade animations that could cause flickering
        this.time.delayedCall(1500, () => {
            console.log(`🎒 Destroying pickup message after 1.5s...`);
            messageText.destroy();
            console.log(`🎒 Message destroyed!`);
        });

        // Add to array for tracking
        this.pickupMessages.push(messageText);
    }

    private cleanupOldPickupMessages(force: boolean = false): void {
        if (force) {
            // Destroy ALL existing pickup messages
            console.log(`🎒 Force cleanup: destroying ${this.pickupMessages.length} existing messages`);
            this.pickupMessages.forEach(msg => {
                if (msg && msg.destroy) {
                    msg.destroy();
                }
            });
            this.pickupMessages = [];
            return;
        }

        // Normal cleanup: remove any destroyed messages from the array
        this.pickupMessages = this.pickupMessages.filter(msg => {
            // Check if message still exists and is visible
            if (!msg || !msg.visible) {
                return false;
            }
            return true;
        });

        // If we have too many messages, destroy the oldest ones
        if (this.pickupMessages.length > 3) {
            const toDestroy = this.pickupMessages.shift(); // Remove oldest
            if (toDestroy) {
                toDestroy.destroy();
            }
        }
    }

    private updateInventoryDisplay(player: any): void {
        let inventoryText = `🎒 INVENTORY (${player.items.length} items):\n`;

        if (player.items.length === 0) {
            inventoryText += `No items collected yet\n\n💡 HINT: Walk near colored chests to collect items!`;
        } else {
            // Group items by rarity
            const itemsByRarity: { [key: string]: any[] } = {
                common: [],
                uncommon: [],
                rare: [],
                equipment: []
            };

            player.items.forEach((item: any) => {
                const rarity = item.rarity;
                if (rarity === 'common' || rarity === 'uncommon' || rarity === 'rare' || rarity === 'equipment') {
                    itemsByRarity[rarity].push(item);
                }
            });

            // Display items grouped by rarity
            Object.entries(itemsByRarity).forEach(([rarity, items]) => {
                if (items.length > 0) {
                    inventoryText += `\n${rarity.toUpperCase()} (${items.length}):\n`;
                    items.forEach((item: any) => {
                        inventoryText += `  • ${item.name}\n`;
                    });
                }
            });

            inventoryText += `\n💡 Items are boosting your stats!`;
        }

        this.inventoryText.setText(inventoryText);
    }

    private updateStageInformation(): void {
        if (!this.room || !this.room.state) return;

        const state = this.room.state;
        const minutes = Math.floor(state.timeElapsed / 60);
        const seconds = Math.floor(state.timeElapsed % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update stage text
        let stageName = "UNKNOWN STAGE";
        switch (state.stageLevel) {
            case 1:
                stageName = "STAGE 1: ALIEN JUNGLE";
                break;
            case 2:
                stageName = "STAGE 2: CRYSTAL CAVERNS";
                break;
            case 3:
                stageName = "STAGE 3: ABANDONED BASE";
                break;
        }

        // Get difficulty color and progress
        const difficultyInfo = this.getDifficultyVisualization(state.difficultyLevel, state.timeElapsed);

        // Check for difficulty level changes and add notification
        const previousDifficulty = this.stageText.getData('currentDifficulty') || 'Easy';
        if (previousDifficulty !== state.difficultyLevel) {
            this.showDifficultyNotification(state.difficultyLevel, difficultyInfo.color);
            this.stageText.setData('currentDifficulty', state.difficultyLevel);
        }

        // Enhanced stage text with difficulty visualization
        this.stageText.setText(`${stageName}\n⏱️ Time: ${timeString}\n${difficultyInfo.text}`);
        this.stageText.setColor(difficultyInfo.color);

        // Update objective text based on beacon state
        let objectiveText = "";
        switch (state.beaconState) {
            case "inactive":
                objectiveText = `🎯 PRIMARY OBJECTIVE:\n` +
                                `Explore and collect items\n\n` +
                                `🌟 Find the GREEN STAR BEACON!\n` +
                                `   Walk over the GREEN STAR to activate\n` +
                                `⚡ This calls extraction BUT spawns BOSS\n` +
                                `🛡️ Prepare for the final battle!`;
                break;
            case "charging":
                objectiveText = `🎯 HOLDOUT PHASE ACTIVE!\n\n` +
                                `⚠️ BEACON IS CHARGING\n` +
                                `⏱️ Holdout Time: ${Math.ceil(state.holdoutTimer)}s\n` +
                                `🔥 Enemy waves incoming!\n` +
                                `🛡️ SURVIVE THE ASSAULT!`;
                break;
            case "bossFight":
                objectiveText = `🎯 BOSS FIGHT IN PROGRESS!\n\n` +
                                `⚡ BEACON CHARGED SUCCESSFULLY\n` +
                                `👹 STAGE GUARDIAN AWAKENED\n` +
                                `💀 DEFEAT THE BOSS TO PROCEED\n` +
                                `🎁 GUARANTEED RARE REWARD!`;
                break;
            case "stageComplete":
                objectiveText = `🎯 STAGE COMPLETE!\n\n` +
                                `✅ STAGE ${state.stageLevel} CLEARED\n` +
                                `🚪 Choose your next path:\n` +
                                `⏳ Exit gates spawning soon...`;
                break;
        }

        this.objectiveText.setText(objectiveText);
    }

    private getDifficultyVisualization(difficultyLevel: string, timeElapsed: number): { text: string, color: string } {
        // Color mapping for difficulty levels
        const difficultyColors: { [key: string]: string } = {
            "Easy": "#00ff00",      // Green
            "Medium": "#ffff00",    // Yellow
            "Hard": "#ff9900",      // Orange
            "Very Hard": "#ff3300", // Red-orange
            "INSANE": "#ff0000"     // Red
        };

        const color = difficultyColors[difficultyLevel] || "#ffffff";

        // Create progress bar for difficulty progression (60 seconds per level)
        const currentLevelProgress = (timeElapsed % 60) / 60; // Progress within current level (0-1)
        const progressLength = Math.floor(currentLevelProgress * 20); // Max 20 chars
        const emptyLength = 20 - progressLength;
        const progressBar = "█".repeat(progressLength) + "░".repeat(emptyLength);

        const text = `📊 Difficulty: ${difficultyLevel}\n   ${progressBar}`;

        return { text, color };
    }

    private showDifficultyNotification(newDifficulty: string, color: string): void {
        // Create a dramatic notification for difficulty changes
        const notification = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 3,
            `⚠️ DIFFICULTY INCREASED!\n${newDifficulty.toUpperCase()}`,
            {
                fontSize: '32px',
                color: color,
                backgroundColor: 'rgba(0,0,0,0.9)',
                padding: { x: 20, y: 15 },
                stroke: color,
                strokeThickness: 3,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 8,
                    stroke: true,
                    fill: true
                }
            }
        );

        notification.setOrigin(0.5);
        notification.setScrollFactor(0);
        notification.setDepth(1000);
        notification.setAlpha(0);

        // Dramatic entrance animation
        this.tweens.add({
            targets: notification,
            alpha: 1,
            scale: { from: 0.5, to: 1.2 },
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold and pulse
                this.tweens.add({
                    targets: notification,
                    scale: { from: 1.2, to: 1.0 },
                    duration: 200,
                    ease: 'Power2.easeOut',
                    onComplete: () => {
                        // Screen shake effect
                        this.cameras.main.shake(300, 0.01);

                        // Fade out after delay
                        this.time.delayedCall(2000, () => {
                            this.tweens.add({
                                targets: notification,
                                alpha: 0,
                                scale: 0.8,
                                duration: 500,
                                ease: 'Power2.easeIn',
                                onComplete: () => {
                                    notification.destroy();
                                }
                            });
                        });
                    }
                });
            }
        });
    }

    private showDamageIndicator(x: number, y: number, damage: number, color: string = '#ff0000'): void {
        // Check for critical hit (high damage)
        const isCritical = damage >= 50;
        const finalColor = isCritical ? '#ffff00' : color; // Yellow for critical hits
        const fontSize = isCritical ? '28px' : '20px';
        const damageText = isCritical ? `-${damage}!` : `-${damage}`;

        // Create floating damage number
        const damageObj = this.add.text(x, y, damageText, {
            fontSize: fontSize,
            fontFamily: 'Arial Black',
            color: finalColor,
            stroke: '#000000',
            strokeThickness: 3,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                stroke: true,
                fill: true
            }
        });

        damageObj.setOrigin(0.5);
        damageObj.setScrollFactor(0);
        damageObj.setDepth(500);

        // Enhanced animation for critical hits
        const animDuration = isCritical ? 1200 : 800;
        const floatDistance = isCritical ? 60 : 40;
        const finalScale = isCritical ? 1.5 : 1.2;

        // Floating upward animation with possible critical hit effects
        this.tweens.add({
            targets: damageObj,
            y: y - floatDistance,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.5, to: finalScale },
            duration: animDuration,
            ease: 'Power2.easeOut',
            onComplete: () => {
                damageObj.destroy();
            }
        });

        // Add extra effects for critical hits
        if (isCritical) {
            // Add a quick flash
            this.cameras.main.flash(100, 255, 255, 0, false);

            // Add screen shake for critical hits
            this.cameras.main.shake(150, 0.012);
        }
    }

    private toggleHelp(): void {
        if (this.helpText.alpha === 0) {
            this.helpText.setAlpha(1);
        } else {
            this.helpText.setAlpha(0.3);
        }
    }

    init() {
        // This is a standard lifecycle method, it should not be async.
    }

    preload() {
        // Removed this.load.image('projectile', 'assets/projectile.png');
    }

    async create() {
        // Calculate layout based on actual browser window size
        this.calculateLayout();

        // Set up the camera to fill the entire browser window
        this.cameras.main.setViewport(0, 0, this.UI_CONFIG.VIEWPORT_WIDTH, this.UI_CONFIG.VIEWPORT_HEIGHT);
        this.cameras.main.setBounds(0, 0, this.UI_CONFIG.GAME_WIDTH, this.UI_CONFIG.GAME_HEIGHT);
        this.cameras.main.setZoom(1);

        console.log(`Game created with viewport: ${this.UI_CONFIG.VIEWPORT_WIDTH}x${this.UI_CONFIG.VIEWPORT_HEIGHT}`);
        console.log(`Game area: ${this.UI_CONFIG.GAME_AREA_WIDTH}x${this.UI_CONFIG.VIEWPORT_HEIGHT}`);
        console.log(`Left sidebar: ${this.UI_CONFIG.LEFT_SIDEBAR_WIDTH}px, Right sidebar: ${this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH}px`);

        // Initialize input keys here
        if (this.input.keyboard) {
            this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
            this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
            this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
            this.keyH = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
            this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
            this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            // Initialize dash cooldown tracking
            this.dashCooldown = 0;
            this.isDashing = false;
        }

        console.log('Joining room...');

        try {
            const client = new Client('ws://localhost:2567');
            this.room = await client.joinOrCreate('my_room');
            console.log('Joined successfully!');

            // Move this code inside onStateChange.once
            // console.log(`Client World Dimensions: ${this.room.state.worldWidth}x${this.room.state.worldHeight}`);

            this.room.onStateChange.once((state) => {
                console.log(`Client World Dimensions: ${state.worldWidth}x${state.worldHeight}`);

                // Add a background to represent the world bounds
                const worldBackground = this.add.rectangle(0, 0, state.worldWidth, state.worldHeight, 0x333366).setOrigin(0);
                worldBackground.setStrokeStyle(4, 0x666699);
                worldBackground.setDepth(-1); // Ensure background is behind everything else

                // Add random dots for visual context
                const dotGraphics = this.add.graphics({ fillStyle: { color: 0xaaaaaa, alpha: 0.5 } });
                const numberOfDots = 500;
                for (let i = 0; i < numberOfDots; i++) {
                    const x = Phaser.Math.Between(0, state.worldWidth);
                    const y = Phaser.Math.Between(0, state.worldHeight);
                    dotGraphics.fillCircle(x, y, 2); // Small dots
                }
            dotGraphics.setDepth(0); // Ensure dots are on top of background

            // Set camera bounds and follow player
                this.cameras.main.setBounds(0, 0, state.worldWidth, state.worldHeight);

                const $ = getStateCallbacks(this.room);

                $(this.room.state).players.onAdd((_player, sessionId) => {
                console.log(`Adding player: ${sessionId} at (${_player.x}, ${_player.y})`);
                const rect = this.add.rectangle(_player.x, _player.y, 32, 32, 0xff0000);
                const entity = this.physics.add.existing(rect, false);
                entity.setDepth(0); // Explicitly set depth
                this.playerEntities[sessionId] = entity;                                                    // Make camera follow this client's player
                                                    if (sessionId === this.room.sessionId) {
                                                        console.log(`Camera: Starting to follow local player ${sessionId}. Entity:`, entity);
                                                        console.log(`Camera bounds: 0,0 to ${this.UI_CONFIG.GAME_WIDTH},${this.UI_CONFIG.GAME_HEIGHT}`);
                                                        console.log(`Camera viewport: 0,0 to ${this.UI_CONFIG.VIEWPORT_WIDTH},${this.UI_CONFIG.VIEWPORT_HEIGHT}`);

                                                        this.cameras.main.startFollow(entity);

                                                        // Configure camera to keep player centered in the game area
                                                        this.cameras.main.setLerp(0.15); // Responsive but smooth following

                                                        // No deadzone - always keep player centered
                                                        this.cameras.main.setDeadzone(0, 0);

                                                        // Ensure camera stays within game world bounds
                                                        this.cameras.main.setBounds(0, 0, this.UI_CONFIG.GAME_WIDTH, this.UI_CONFIG.GAME_HEIGHT);

                                                        console.log(`Camera setup: Player-centered camera with smooth following`);

                                                        // Handle window resize
                                                        window.addEventListener('resize', () => {
                                                            this.handleResize();
                                                        });

                                                        // Listen for global state changes
                                                        $(this.room.state).onChange(() => {
                                                            this.updateStageInformation();
                                                        });

                                                        // Create left sidebar background for help text
                                                        const leftSidebarBg = this.add.rectangle(
                                                            this.UI_CONFIG.LEFT_SIDEBAR_WIDTH/2,
                                                            this.UI_CONFIG.VIEWPORT_HEIGHT/2,
                                                            this.UI_CONFIG.LEFT_SIDEBAR_WIDTH,
                                                            this.UI_CONFIG.VIEWPORT_HEIGHT,
                                                            0x000000
                                                        );
                                                        leftSidebarBg.setAlpha(0.8);
                                                        leftSidebarBg.setScrollFactor(0);
                                                        leftSidebarBg.setDepth(30);

                                                        // Create right sidebar background for inventory
                                                        const rightSidebarBg = this.add.rectangle(
                                                            this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH/2,
                                                            this.UI_CONFIG.VIEWPORT_HEIGHT/2,
                                                            this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH,
                                                            this.UI_CONFIG.VIEWPORT_HEIGHT,
                                                            0x000000
                                                        );
                                                        rightSidebarBg.setAlpha(0.8);
                                                        rightSidebarBg.setScrollFactor(0);
                                                        rightSidebarBg.setDepth(30);

                                                        // LEFT SIDEBAR - Help Text
                                                        this.helpText = this.add.text(10, 10,
                                                            `🎮 PRIMAL GENESIS v0.1\n\n` +
                                                            `📦 OBJECTIVES:\n` +
                                                            `Find items → Activate beacon →\n` +
                                                            `Survive holdout → Defeat boss\n\n` +
                                                            `🎮 CONTROLS:\n` +
                                                            `WASD - Move\n` +
                                                            `H - Toggle help\n` +
                                                            `E - Use equipment (when equipped)\n` +
                                                            `Auto-attack: ON\n\n` +
                                                            `💎 ITEMS:\n` +
                                                            `🟤 Common chests (basic)\n` +
                                                            `🟠 Large chests (advanced)\n` +
                                                            `🔵 Equipment (special)\n` +
                                                            `   → Press E to activate!\n` +
                                                            `🟣 Research labs (choices)\n\n` +
                                                            `⚔️ EQUIPMENT GUIDE:\n` +
                                                            `• Quantum Shifter: E = Dash attack\n` +
                                                            `• Alien Spore Pod: E = Throw grenade\n` +
                                                            `• Equipment has cooldowns\n` +
                                                            `• Only 1 equipment at a time\n\n` +
                                                            `⚔️ TIPS:\n` +
                                                            `• Walk over items to pickup\n` +
                                                            `• Avoid enemy contact\n` +
                                                            `• Red flash = damage\n\n` +
                                                            `🔬 MISSION:\n` +
                                                            `Stranded on Planet X-47.\n` +
                                                            `Collect alien bio-tech to\n` +
                                                            `survive and call extraction!`,
                                                            {
                                                                fontSize: '14px',
                                                                color: '#ffff00',
                                                                backgroundColor: 'rgba(0,0,0,0.9)',
                                                                padding: { x: 10, y: 10 },
                                                                wordWrap: { width: this.UI_CONFIG.LEFT_SIDEBAR_WIDTH - 25 },
                                                                align: 'left',
                                                                fixedWidth: this.UI_CONFIG.LEFT_SIDEBAR_WIDTH - 25,
                                                                fixedHeight: this.UI_CONFIG.VIEWPORT_HEIGHT - 20,
                                                                shadow: {
                                                                    offsetX: 1,
                                                                    offsetY: 1,
                                                                    color: '#000000',
                                                                    blur: 2,
                                                                    stroke: true,
                                                                    fill: true
                                                                }
                                                            });
                                                        this.helpText.setScrollFactor(0);
                                                        this.helpText.setDepth(100);

                                                        // RIGHT SIDEBAR - Top: Player Health
                                                        const rightSidebarX = this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH + 10;
                                                        console.log(`Creating right sidebar at X: ${rightSidebarX}, viewport width: ${this.UI_CONFIG.VIEWPORT_WIDTH}`);
                                                        this.playerHealthText = this.add.text(rightSidebarX, 10, 'Health: 100/100', {
                                                            fontSize: '16px',
                                                            color: '#ffffff',
                                                            backgroundColor: 'rgba(255,0,0,0.8)',
                                                            padding: { x: 8, y: 6 },
                                                            wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
                                                            shadow: {
                                                                offsetX: 1,
                                                                offsetY: 1,
                                                                color: '#000000',
                                                                blur: 1,
                                                                stroke: true,
                                                                fill: true
                                                            }
                                                        });
                                                        this.playerHealthText.setScrollFactor(0);
                                                        this.playerHealthText.setDepth(100);

                                                        // TOP LEFT - Stage Information (moved to avoid overlap)
                                                        this.stageText = this.add.text(10, 10,
                                                            `STAGE 1: ALIEN JUNGLE\n` +
                                                            `⏱️ Time: 0:00\n` +
                                                            `📊 Difficulty: Easy`,
                                                            {
                                                                fontSize: '13px',
                                                                color: '#00ff00',
                                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                                padding: { x: 8, y: 6 },
                                                                wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
                                                                shadow: {
                                                                    offsetX: 1,
                                                                    offsetY: 1,
                                                                    color: '#000000',
                                                                    blur: 1,
                                                                    stroke: true,
                                                                    fill: true
                                                                }
                                                            });
                                                        this.stageText.setScrollFactor(0);
                                                        this.stageText.setDepth(100);

                                                        // RIGHT SIDEBAR - Objective Information (moved up to create more space)
                                                        this.objectiveText = this.add.text(rightSidebarX, 100,
                                                            `🎯 PRIMARY OBJECTIVE:\n` +
                                                            `Survive and collect items\n\n` +
                                                            `📦 Find: Bio-Resonance Beacon\n` +
                                                            `⚡ Activate beacon to call extraction\n` +
                                                            `🛡️ Defend against alien wildlife`,
                                                            {
                                                                fontSize: '12px',
                                                                color: '#ffff00',
                                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                                padding: { x: 8, y: 6 },
                                                                wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
                                                                shadow: {
                                                                    offsetX: 1,
                                                                    offsetY: 1,
                                                                    color: '#000000',
                                                                    blur: 1,
                                                                    stroke: true,
                                                                    fill: true
                                                                }
                                                            });
                                                        this.objectiveText.setScrollFactor(0);
                                                        this.objectiveText.setDepth(100);

                                                        // RIGHT SIDEBAR - Inventory (moved down to create more space for objectives)
                                                        this.inventoryText = this.add.text(rightSidebarX, 320,
                                                            `🎒 INVENTORY:\nNo items collected\n\n💡 Explore to find alien tech!`,
                                                            {
                                                                fontSize: '12px',
                                                                color: '#00ff00',
                                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                                padding: { x: 6, y: 6 },
                                                                wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
                                                                shadow: {
                                                                    offsetX: 1,
                                                                    offsetY: 1,
                                                                    color: '#000000',
                                                                    blur: 1,
                                                                    stroke: true,
                                                                    fill: true
                                                                }
                                                            });
                                                        this.inventoryText.setScrollFactor(0);
                                                        this.inventoryText.setDepth(100);

                                                        // Level and XP display
                                                        this.levelText = this.add.text(rightSidebarX, 280,
                                                            `⭐ LEVEL: ${_player.level}\n💎 XP: ${_player.xp}/${Math.floor(100 * Math.pow(1.2, _player.level))}`,
                                                            {
                                                                fontSize: '14px',
                                                                color: '#ffff00',
                                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                                padding: { x: 6, y: 6 },
                                                                wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
                                                                shadow: {
                                                                    offsetX: 1,
                                                                    offsetY: 1,
                                                                    color: '#000000',
                                                                    blur: 1,
                                                                    stroke: true,
                                                                    fill: true
                                                                }
                                                            });
                                                        this.levelText.setScrollFactor(0);
                                                        this.levelText.setDepth(100);

                                                        // Initialize previous health for damage feedback
                                                        entity.setData('previousHealth', _player.health);
                                                    }

                                                    $(_player).onChange(() => {
                                                        entity.x = _player.x;
                                                        entity.y = _player.y;

                                                        // Debug camera following for local player
                                                        if (sessionId === this.room.sessionId) {
                                                            console.log(`Local player position: (${entity.x}, ${entity.y})`);
                                                            console.log(`Camera position: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
                                                        }

                                                        if (sessionId === this.room.sessionId) {
                                                            this.playerHealthText.setText(`Health: ${Math.round(_player.health)}/${Math.round(_player.calculatedMaxHealth)}`);

                                                            // Update level and XP display
                                                            const xpForNextLevel = Math.floor(100 * Math.pow(1.2, _player.level));
                                                            this.levelText.setText(`⭐ LEVEL: ${_player.level}\n💎 XP: ${_player.xp}/${xpForNextLevel}`);

                                                            // Enhanced damage feedback with screen shake and damage indicators
                                                            const previousHealth = entity.getData('previousHealth');
                                                            if (_player.health < previousHealth) {
                                                                const damageAmount = previousHealth - _player.health;

                                                                // Screen shake for local player
                                                                if (sessionId === this.room.sessionId) {
                                                                    this.cameras.main.shake(200, 0.015);

                                                                    // Red damage flash effect
                                                                    this.cameras.main.flash(150, 255, 0, 0, false);
                                                                }

                                                                // Damage color flash on player
                                                                entity.fillColor = 0xff0000;
                                                                this.time.delayedCall(100, () => {
                                                                    entity.fillColor = 0xff0000; // Original player color
                                                                });

                                                                // Show floating damage indicator
                                                                this.showDamageIndicator(entity.x, entity.y - 20, damageAmount, '#ff0000');
                                                            }
                                                            entity.setData('previousHealth', _player.health);

                                                            // Visual effects for dashing
                                                            if (_player.isDashing) {
                                                                // Create cyan dash aura
                                                                (entity as any).setTint(0x00ffff);
                                                                entity.setAlpha(0.8);

                                                                // Add dash trail effect
                                                                if (Math.random() < 0.3) { // 30% chance per frame
                                                                    const trail = this.add.circle(entity.x, entity.y, 12, 0x00ffff, 0.4);
                                                                    trail.setScrollFactor(0);
                                                                    trail.setDepth(3);

                                                                    this.tweens.add({
                                                                        targets: trail,
                                                                        alpha: 0,
                                                                        scale: 0.5,
                                                                        duration: 200,
                                                                        ease: 'Power2.easeOut',
                                                                        onComplete: () => trail.destroy()
                                                                    });
                                                                }
                                                            } else {
                                                                // Reset visual effects when not dashing
                                                                if (entity && typeof entity.clearTint === 'function') {
                                                                    (entity as any).clearTint();
                                                                }
                                                                if (entity && typeof entity.setAlpha === 'function') {
                                                                    entity.setAlpha(1);
                                                                }
                                                            }

                                                            // Track item pickups for this client's player
                                                            $(_player.items).onAdd((item, _index) => {
                                                                this.showPickupMessage(`Picked up: ${item.name} (${item.rarity})`);
                                                                console.log(`Player picked up item: ${item.name} - ${item.description}`);
                                                                this.updateInventoryDisplay(_player);
                                                            });
                                                        }
                                                    });
                                                });
                                    
                                                $(this.room.state).players.onRemove((_player, sessionId) => {
                                                    console.log(`Removing player: ${sessionId}`);
                                                    const entity = this.playerEntities[sessionId];
                                                    if (entity) {
                                                        entity.destroy();
                                                        delete this.playerEntities[sessionId];
                                                    }
                                                    if (sessionId === this.room.sessionId && this.playerHealthText) {
                                                        this.playerHealthText.destroy();
                                                    }
                                                });
                                    
            $(this.room.state).enemies.onAdd((enemy, sessionId) => {
                console.log(`Adding enemy: ${sessionId} of type ${enemy.typeId} at (${enemy.x}, ${enemy.y})`);

                // Check if this is an Elite enemy
                const isElite = (enemy as any).isElite;
                const eliteModifier = (enemy as any).eliteModifier;

                let enemyColor = 0x0000ff; // Default to blue for waspDrone
                let healthBarColor = 0x00ff00; // Default green health bar
                let enemySize = 28;
                let borderWidth = 2;
                let borderColor = 0xff0000; // Red border for regular enemies

                // let enemyImageKey = 'enemy'; // Default image key
                if (enemy.typeId === "spitter") {
                    enemyColor = 0x00ff00; // Green for spitter
                    healthBarColor = 0xff0000; // Red health bar for spitter
                    // If we had a spitter.png, we'd use enemyImageKey = 'spitter';
                } else if (enemy.typeId === "charger") {
                    enemyColor = 0x800080; // Purple for charger
                    healthBarColor = 0x00ff00; // Green health bar for charger
                    // If we had a charger.png, we'd use enemyImageKey = 'charger';
                }

                // Apply Elite enemy visual enhancements
                if (isElite) {
                    enemySize = 36; // Larger size for elite enemies
                    borderWidth = 4; // Thicker border

                    // Set color based on elite modifier
                    switch (eliteModifier) {
                        case "glacial":
                            borderColor = 0x00ffff; // Cyan border for glacial
                            enemyColor = 0x4169e1; // Ice blue color
                            console.log(`❄️ Adding GLACIAL elite enemy`);
                            break;
                        case "overloading":
                            borderColor = 0xffff00; // Yellow border for overloading
                            enemyColor = 0xff8c00; // Orange color
                            console.log(`⚡ Adding OVERLOADING elite enemy`);
                            break;
                        case "venomous":
                            borderColor = 0x800080; // Purple border for venomous
                            enemyColor = 0x32cd32; // Lime green color
                            console.log(`☠️ Adding VENOMOUS elite enemy`);
                            break;
                        case "swift":
                            borderColor = 0xff69b4; // Pink border for swift
                            enemyColor = 0xffd700; // Gold color
                            console.log(`💨 Adding SWIFT elite enemy`);
                            break;
                        default:
                            borderColor = 0xffffff; // White border for unknown elite
                            enemyColor = 0xff0000; // Red color
                            console.log(`👹 Adding UNKNOWN elite enemy`);
                            break;
                    }
                }

                // Enemies are SQUARES - clear distinction from items
                const enemySquare = this.add.rectangle(enemy.x, enemy.y, enemySize, enemySize, enemyColor);
                enemySquare.setStrokeStyle(borderWidth, borderColor);
                const entity = this.physics.add.existing(enemySquare, false);
                entity.setDepth(0); // Explicitly set depth
                this.enemyEntities[sessionId] = entity;

                // Create health bar
                const healthBar = this.createHealthBar(32, 4, healthBarColor);
                healthBar.setDepth(1); // Health bar on top of enemy
                healthBar.x = enemy.x - 16;
                healthBar.y = enemy.y - 20;
                entity.setData('healthBar', healthBar);

                // Initialize previous health for damage indicators
                entity.setData('previousHealth', enemy.health);

                // Add visual aura for Elite enemies
                if (isElite) {
                    // Create pulsing aura effect
                    const auraSize = enemySize + 12;
                    const aura = this.add.circle(enemy.x, enemy.y, auraSize/2, 0xffffff);
                    aura.setStrokeStyle(3, borderColor);
                    aura.setAlpha(0.3);
                    aura.setDepth(-1); // Behind the enemy but above ground

                    // Store aura reference for animation
                    entity.setData('eliteAura', aura);

                    // Start pulsing animation
                    this.tweens.add({
                        targets: aura,
                        alpha: 0.6,
                        scale: 1.1,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });

                    console.log(`✨ Added ${eliteModifier} elite aura effect`);
                }

                $(enemy).onChange(() => {
                    // Update position - this fixes the charger movement bug
                    entity.x = enemy.x;
                    entity.y = enemy.y;

                    // Visual feedback for charger's charging state
                    if (enemy.typeId === "charger") {
                        if (enemy.isCharging) {
                            entity.fillColor = 0xffff00; // Yellow color during charge
                        } else {
                            entity.fillColor = 0x800080; // Original charger color (purple)
                        }
                    }

                    // Check for enemy damage and show indicators
                    const previousHealth = entity.getData('previousHealth');
                    if (enemy.health < previousHealth) {
                        const damageAmount = previousHealth - enemy.health;

                        // Show damage indicator for enemy
                        this.showDamageIndicator(entity.x, entity.y - 25, damageAmount, '#ff6600');

                        // Screen shake for big hits
                        if (damageAmount >= 20) {
                            this.cameras.main.shake(100, 0.008);
                        }
                    }
                    entity.setData('previousHealth', enemy.health);

                    // Update health bar position and width
                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                    if (healthBar) {
                        healthBar.x = entity.x - 16;
                        healthBar.y = entity.y - 20;
                        healthBar.clear();
                        healthBar.fillStyle(0x00ff00, 1);
                        healthBar.fillRect(0, 0, (enemy.health / enemy.maxHealth) * 32, 4);
                    }

                    // Update Elite enemy aura position
                    const eliteAura = entity.getData('eliteAura') as Phaser.GameObjects.Arc;
                    if (eliteAura) {
                        eliteAura.x = entity.x;
                        eliteAura.y = entity.y;
                    }
                });
            });

                            $(this.room.state).enemies.onRemove((_enemy, sessionId) => {
                                console.log(`Removing enemy: ${sessionId}`);
                                const entity = this.enemyEntities[sessionId];
                                if (entity) {
                                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                                    const eliteAura = entity.getData('eliteAura') as Phaser.GameObjects.Arc;

                                    if (healthBar) healthBar.destroy();
                                    if (eliteAura) eliteAura.destroy(); // Clean up Elite aura
                                    entity.destroy();
                                    delete this.enemyEntities[sessionId];
                                }
                            });
            
                                            $(this.room.state).projectiles.onAdd((projectile, projectileId) => {
                                                console.log(`Adding projectile: ${projectileId} of type ${projectile.projectileType} at (${projectile.x}, ${projectile.y})`);

                                                let projectileColor = 0xff0000; // Red for player projectiles
                                                let projectileSize = 12; // Default size
                                                if (projectile.projectileType === "spitterProjectile") {
                                                    projectileColor = 0x00ff00; // Bright green for spitter projectiles
                                                    projectileSize = 20; // Larger size for spitter projectiles
                                                }
                                                const projectileRect = this.add.rectangle(projectile.x, projectile.y, projectileSize, projectileSize, projectileColor);
                                                projectileRect.setStrokeStyle(2, 0xffffff); // White border for visibility
                                                projectileRect.setDepth(999); // Ensure it's always on top

                                                console.log(`DEBUG Client: Projectile ${projectileId} created. Active: ${projectileRect.active}, Visible: ${projectileRect.visible}, Depth: ${projectileRect.depth}, Pos: (${projectileRect.x}, ${projectileRect.y})`);
                                                                    this.projectileEntities[projectileId] = projectileRect;
                                                
                                                                    $(projectile).onChange(() => {
                                                                        const prevX = projectileRect.x;
                                                                        const prevY = projectileRect.y;
                                                                        projectileRect.x = projectile.x;
                                                                        projectileRect.y = projectile.y;
                                                                        projectileRect.rotation = projectile.rotation;

                                                                                  });
                            });
            
                            $(this.room.state).projectiles.onRemove((projectile, projectileId) => {
                                console.log(`Removing projectile: ${projectileId}. Final TTL: ${projectile.timeToLive.toFixed(2)}`);

                                const entity = this.projectileEntities[projectileId];
                                if (entity) {
                                    entity.destroy();
                                    delete this.projectileEntities[projectileId];
                                }
                            });

                // Interactables rendering
                $(this.room.state).interactables.onAdd((interactable, interactableId) => {
                    console.log(`Adding interactable: ${interactableId} of type ${interactable.type} at (${interactable.x}, ${interactable.y})`);

                    let color = 0xffd700; // Default gold color
                    let size = 40; // Default size

                    switch (interactable.type) {
                        case "smallChest":
                            color = 0x8b4513; // Brown
                            size = 20; // Smaller (was 30)
                            break;
                        case "largeChest":
                            color = 0xff8c00; // Dark orange
                            size = 25; // Smaller (was 40)
                            break;
                        case "equipmentBarrel":
                            color = 0x4169e1; // Royal blue
                            size = 22; // Smaller (was 35)
                            break;
                        case "triShop":
                            color = 0x9370db; // Medium purple
                            size = 28; // Smaller (was 45)
                            break;
                        case "whisperingTotem":
                            color = 0x800080; // Dark purple - mystical
                            size = 30; // Slightly larger - important
                            break;
                        case "altarOfTheApex":
                            color = 0xff4500; // Dark orange-red - dangerous/powerful
                            size = 32; // Large - very important
                            break;
                        case "bioResonanceBeacon":
                            color = 0x00ff00; // Bright green for beacon
                            size = 35; // Still important but smaller (was 50)
                            break;
                    }

                    // Most items are CIRCLES, but BEACON is special - make it a star!
                    let itemShape: Phaser.GameObjects.GameObject;

                    if (interactable.type === "bioResonanceBeacon") {
                        // Create a star shape for the beacon - very distinctive!
                        itemShape = this.add.star(interactable.x, interactable.y, 5, size/2, size/4, color);
                        (itemShape as any).setStrokeStyle(4, 0xffffff); // Thick white border for beacon
                        (itemShape as any).setDepth(5); // Higher depth for important objective
                        console.log(`🌟 Created star beacon at (${interactable.x}, ${interactable.y})`);
                    } else if (interactable.type === "altarOfTheApex") {
                        // Create triangle shape for altar - distinctive and mystical
                        itemShape = this.add.triangle(interactable.x, interactable.y, size, size/2, -size/2, -size/2, color);
                        (itemShape as any).setStrokeStyle(4, 0xffffff); // Thick white border for altar
                        (itemShape as any).setDepth(5); // High depth for important interactable
                        console.log(`🗿 Created triangle altar at (${interactable.x}, ${interactable.y})`);
                    } else if (interactable.type === "whisperingTotem") {
                        // Create diamond shape for totem - mystical appearance
                        const points = [
                            { x: 0, y: -size/2 },     // Top
                            { x: size/3, y: 0 },      // Right
                            { x: 0, y: size/2 },      // Bottom
                            { x: -size/3, y: 0 }      // Left
                        ];
                        itemShape = this.add.polygon(interactable.x, interactable.y, points, color);
                        (itemShape as any).setStrokeStyle(3, 0xffffff); // White border for totem
                        (itemShape as any).setDepth(3); // Medium depth
                        console.log(`✨ Created diamond totem at (${interactable.x}, ${interactable.y})`);
                    } else {
                        // Regular items are circles
                        itemShape = this.add.circle(interactable.x, interactable.y, size/2, color);
                        (itemShape as any).setStrokeStyle(3, 0xffffff); // White border for items
                        (itemShape as any).setDepth(2); // Above enemies but below UI
                    }

                    this.interactableEntities[interactableId] = itemShape;

                    // Add floating effect
                    this.tweens.add({
                        targets: itemShape,
                        y: (itemShape as any).y - 5,
                        duration: 1000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });

                    $(interactable).onChange(() => {
                        if (interactable.isOpen) {
                            // Visual feedback for opened interactable
                            if (interactable.type === "bioResonanceBeacon") {
                                (itemShape as any).setFillStyle(0x444444); // Dark gray when opened
                                (itemShape as any).setAlpha(0.5); // Semi-transparent
                            } else {
                                (itemShape as any).setFillStyle(0x444444); // Dark gray when opened
                                (itemShape as any).setAlpha(0.5); // Semi-transparent
                            }
                        } else {
                            // Restore original appearance
                            (itemShape as any).setFillStyle(color);
                            (itemShape as any).setAlpha(1);
                        }
                    });
                });

                $(this.room.state).interactables.onRemove((_interactable, interactableId) => {
                    console.log(`Removing interactable: ${interactableId}`);
                    const entity = this.interactableEntities[interactableId];
                    if (entity) {
                        entity.destroy();
                        delete this.interactableEntities[interactableId];
                    }
                });

                // XP Entities rendering
                $(this.room.state).xpEntities.onAdd((xpEntity, xpId) => {
                    console.log(`Adding XP entity: ${xpId} with value ${xpEntity.xpValue} at (${xpEntity.x}, ${xpEntity.y})`);

                    // Create smaller glowing yellow orb for XP (easier pickup)
                    const xpOrb = this.add.circle(xpEntity.x, xpEntity.y, 5, 0xffff00);
                    xpOrb.setStrokeStyle(1, 0xffffff);
                    xpOrb.setDepth(3);

                    // Store XP value for size indication
                    xpOrb.setData('xpValue', xpEntity.xpValue);

                    // Add faster pulsing glow effect
                    xpOrb.setAlpha(0.7);
                    this.tweens.add({
                        targets: xpOrb,
                        alpha: 1,
                        scale: 1.1,
                        duration: 300,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });

                    // Note: XP entity position updates are handled by the server's magnet system
                    // and automatically synced to clients via Schema updates

                    this.xpEntities[xpId] = xpOrb;
                });

                $(this.room.state).xpEntities.onRemove((_xpEntity, xpId) => {
                    console.log(`Removing XP entity: ${xpId}`);
                    const entity = this.xpEntities[xpId];
                    if (entity) {
                        entity.destroy();
                        delete this.xpEntities[xpId];
                    }
                });

                // Player items tracking for HUD - this needs to be moved outside the onStateChange
                // We'll handle this in the existing player.onAdd section
            });

        } catch (e) {
            console.error('Join error', e);
        }
    }

    update() {
        if (!this.room) {
            return;
        }

        // Update stage information periodically
        if (this.time.now % 1000 < 16) { // Update roughly every second
            this.updateStageInformation();
        }

        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= this.game.loop.delta;
            if (this.dashCooldown < 0) this.dashCooldown = 0;
        }

        // Update dash state
        if (this.isDashing && (this.time.now - this.lastDashTime) > this.DASH_DURATION) {
            this.isDashing = false;
        }

        this.inputPayload.x = 0;
        this.inputPayload.y = 0;

        if (this.keyA.isDown) {
            this.inputPayload.x = -1;
        } else if (this.keyD.isDown) {
            this.inputPayload.x = 1;
        }

        if (this.keyW.isDown) {
            this.inputPayload.y = -1;
        } else if (this.keyS.isDown) {
            this.inputPayload.y = 1;
        }

        // Toggle help with H key
        if (Phaser.Input.Keyboard.JustDown(this.keyH)) {
            this.toggleHelp();
        }

        // Use equipment with E key
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
            this.useEquipment();
        }

        // Dash with spacebar
        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this.performDash();
        }

        this.room.send('input', this.inputPayload);
    }

    private useEquipment(): void {
        console.log('🛡️ Attempting to use equipment...');
        // Send equipment activation to server
        this.room.send('useEquipment', {});
    }

    private performDash(): void {
        const currentTime = this.time.now;

        // Check if dash is on cooldown
        if (this.dashCooldown > 0) {
            this.showDashCooldownMessage();
            return;
        }

        // Check if player is moving (require movement input for dash)
        if (this.inputPayload.x === 0 && this.inputPayload.y === 0) {
            return; // No dash without movement input
        }

        // Start dash
        this.isDashing = true;
        this.lastDashTime = currentTime;
        this.dashCooldown = this.DASH_COOLDOWN_TIME;

        // Calculate dash direction (normalized movement input)
        const dashDirection = new Phaser.Math.Vector2(this.inputPayload.x, this.inputPayload.y).normalize();

        // Send dash event to server with direction and duration
        this.room.send('dash', {
            directionX: dashDirection.x,
            directionY: dashDirection.y,
            duration: this.DASH_DURATION
        });

        // Visual effects for dash
        this.createDashEffects();

        console.log(`💨 DASH performed in direction (${dashDirection.x.toFixed(2)}, ${dashDirection.y.toFixed(2)})`);
    }

    private showDashCooldownMessage(): void {
        const remainingSeconds = Math.ceil(this.dashCooldown / 1000);
        this.showPickupMessage(`⏱️ Dash cooldown: ${remainingSeconds}s`);
    }

    private createDashEffects(): void {
        // Find local player entity
        const playerEntity = this.playerEntities[this.room.sessionId];
        if (!playerEntity) return;

        // Create dash trail effect
        const trail = this.add.circle(playerEntity.x, playerEntity.y, 15, 0x00ffff, 0.6);
        trail.setScrollFactor(0);
        trail.setDepth(4);

        // Animate trail fade
        this.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 1.5,
            duration: this.DASH_DURATION,
            ease: 'Power2.easeOut',
            onComplete: () => {
                trail.destroy();
            }
        });

        // Screen effect for dash
        this.cameras.main.flash(100, 0, 255, 255, false); // Cyan flash

        // Brief screen zoom effect
        this.cameras.main.setZoom(1.1);
        this.time.delayedCall(100, () => {
            this.cameras.main.setZoom(1);
        });
    }
}
