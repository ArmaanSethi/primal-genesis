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
    private playerHealthText!: Phaser.GameObjects.Text;
    private pickupMessages: Phaser.GameObjects.Text[] = [];
    private helpText!: Phaser.GameObjects.Text;
    private inventoryText!: Phaser.GameObjects.Text;
    private stageText!: Phaser.GameObjects.Text;
    private objectiveText!: Phaser.GameObjects.Text;

    // Input keys
    private keyW!: Phaser.Input.Keyboard.Key;
    private keyA!: Phaser.Input.Keyboard.Key;
    private keyS!: Phaser.Input.Keyboard.Key;
    private keyD!: Phaser.Input.Keyboard.Key;
    private keyH!: Phaser.Input.Keyboard.Key; // Toggle help
    private keyE!: Phaser.Input.Keyboard.Key; // Use equipment

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

        // Create pickup message at the bottom of the right sidebar to avoid overlap
        const rightSidebarX = this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH + 10;
        const bottomY = this.UI_CONFIG.VIEWPORT_HEIGHT - 80; // Near bottom of screen
        const messageText = this.add.text(rightSidebarX, bottomY, message, {
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

        console.log(`🎒 Created pickup text in right sidebar at (${rightSidebarX}, 320)`);

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

        this.stageText.setText(`${stageName}\n⏱️ Time: ${timeString}\n📊 Difficulty: ${state.difficultyLevel}`);

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
                                                            `🎮 PRIMAL GENESIS v1.0\n\n` +
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

                                                        // RIGHT SIDEBAR - Stage Information
                                                        this.stageText = this.add.text(rightSidebarX, 60,
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

                                                        // RIGHT SIDEBAR - Objective Information
                                                        this.objectiveText = this.add.text(rightSidebarX, 140,
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

                                                        // RIGHT SIDEBAR - Inventory
                                                        this.inventoryText = this.add.text(rightSidebarX, 260,
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

                                                            // Visual feedback for damage
                                                            const previousHealth = entity.getData('previousHealth');
                                                            if (_player.health < previousHealth) {
                                                                entity.fillColor = 0xff0000; // Red color
                                                                this.time.delayedCall(100, () => {
                                                                    entity.fillColor = 0xff0000; // Original player color
                                                                });
                                                            }
                                                            entity.setData('previousHealth', _player.health);

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
                let enemyColor = 0x0000ff; // Default to blue for waspDrone
                let healthBarColor = 0x00ff00; // Default green health bar
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
                // Enemies are SQUARES - clear distinction from items
                const enemySquare = this.add.rectangle(enemy.x, enemy.y, 28, 28, enemyColor);
                enemySquare.setStrokeStyle(2, 0xff0000); // Red border for enemies
                const entity = this.physics.add.existing(enemySquare, false);
                entity.setDepth(0); // Explicitly set depth
                this.enemyEntities[sessionId] = entity;

                // Create health bar
                const healthBar = this.createHealthBar(32, 4, healthBarColor);
                healthBar.setDepth(1); // Health bar on top of enemy
                healthBar.x = enemy.x - 16;
                healthBar.y = enemy.y - 20;
                entity.setData('healthBar', healthBar);

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

                    // Update health bar position and width
                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                    if (healthBar) {
                        healthBar.x = entity.x - 16;
                        healthBar.y = entity.y - 20;
                        healthBar.clear();
                        healthBar.fillStyle(0x00ff00, 1);
                        healthBar.fillRect(0, 0, (enemy.health / enemy.maxHealth) * 32, 4);
                    }
                });
            });

                            $(this.room.state).enemies.onRemove((_enemy, sessionId) => {
                                console.log(`Removing enemy: ${sessionId}`);
                                const entity = this.enemyEntities[sessionId];
                                if (entity) {
                                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                                    healthBar.destroy();
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
                                                                        projectileRect.x = projectile.x;
                                                                        projectileRect.y = projectile.y;
                                                                        projectileRect.rotation = projectile.rotation;
                                                                        // Removed excessive logging that was affecting performance
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

        this.room.send('input', this.inputPayload);
    }

    private useEquipment(): void {
        console.log('🛡️ Attempting to use equipment...');
        // Send equipment activation to server
        this.room.send('useEquipment', {});
    }
}
