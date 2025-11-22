import Phaser from 'phaser';
import { Client, Room, getStateCallbacks } from 'colyseus.js';

// Use the 'type' keyword to import the server-side schema for type-checking
import type { MyRoomState } from '../../../server/src/rooms/schema/MyRoomState';

export class GameScene extends Phaser.Scene {
    private room!: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: Phaser.GameObjects.Sprite } = {};
    private enemyEntities: { [sessionId: string]: Phaser.GameObjects.Sprite } = {};
    private projectileEntities: { [projectileId: string]: Phaser.GameObjects.Sprite } = {};
    private interactableEntities: { [interactableId: string]: Phaser.GameObjects.Sprite } = {};
    private xpEntities: { [xpId: string]: Phaser.GameObjects.Arc } = {};
    private playerHealthText!: Phaser.GameObjects.Text;
    private pickupMessages: Phaser.GameObjects.Text[] = [];

    // Beacon direction indicator
    private beaconDirectionText: Phaser.GameObjects.Text | null = null;
    private beaconArrow: Phaser.GameObjects.Triangle | null = null;
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

    // Game progress tracking
    private enemiesDefeatedCount: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    // UI Layout Configuration
    private readonly UI_CONFIG = {
        GAME_WIDTH: 8000,  // Game world size - MATCHES SERVER worldWidth
        GAME_HEIGHT: 6000, // Game world size - MATCHES SERVER worldHeight
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
        healthBar.fillStyle(0x000000, 0.8);
        healthBar.fillRect(-2, -2, width + 4, height + 4); // Border
        healthBar.fillStyle(color, 1);
        healthBar.fillRect(0, 0, width, height);
        // Shine effect
        healthBar.fillStyle(0xffffff, 0.2);
        healthBar.fillRect(0, 0, width, height / 2);
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
            fontSize: '18px',
            fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            color: '#ffff00',
            fontStyle: 'bold',
            backgroundColor: 'rgba(0,0,0,0.85)',
            padding: { x: 12, y: 8 },
            wordWrap: { width: this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH - 20 },
            stroke: '#000000',
            strokeThickness: 2,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
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
        let inventoryText = `🎒 INVENTORY (${player.items.length})\n─────────────────\n`;

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
        this.stageText.setText(`${stageName}\n⏱️ ${timeString}\n${difficultyInfo.text}`);
        this.stageText.setColor(difficultyInfo.color);
        this.stageText.setFontFamily('"Segoe UI", Roboto, Helvetica, Arial, sans-serif');
        this.stageText.setFontSize('20px');
        this.stageText.setStroke('#000000', 4);
        this.stageText.setShadow(2, 2, '#000000', 4, true, true);

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
                fontSize: '48px',
                fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
                color: color,
                backgroundColor: 'rgba(0,0,0,0.9)',
                padding: { x: 40, y: 20 },
                stroke: '#ffffff',
                strokeThickness: 4,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#000000',
                    blur: 10,
                    stroke: true,
                    fill: true
                },
                align: 'center'
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
            fontFamily: '"Arial Black", "Segoe UI Black", sans-serif',
            color: finalColor,
            stroke: '#000000',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 2,
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
        // Assets are now generated procedurally in create() to ensure transparency and correct sizing
        // This bypasses the issue with the non-transparent generated PNGs
    }

    private createProceduralTextures() {
        // Helper to create a texture from a graphics object
        const generate = (key: string, width: number, height: number, drawFn: (g: Phaser.GameObjects.Graphics) => void) => {
            const g = this.make.graphics({ x: 0, y: 0 });
            drawFn(g);
            g.generateTexture(key, width, height);
            g.destroy();
        };

        // 1. Ground Tile (Sci-fi Hex Grid)
        generate('ground_tile', 128, 128, (g) => {
            g.fillStyle(0x0d1117, 1); // Deep space/ground color
            g.fillRect(0, 0, 128, 128);

            // Subtle hex grid pattern
            g.lineStyle(1, 0x21262d, 0.5);
            // Draw some random tech details
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * 128;
                const y = Math.random() * 128;
                const size = Math.random() * 10 + 5;
                g.fillStyle(0x30363d, 0.3);
                g.fillRect(x, y, size, size);
            }

            g.lineStyle(2, 0x1f2428, 0.8);
            g.strokeRect(0, 0, 128, 128);
        });

        // 2. Player (Researcher Lemur) - Detailed
        generate('researcher_lemur', 64, 64, (g) => {
            // Shadow
            g.fillStyle(0x000000, 0.5);
            g.fillCircle(32, 56, 16);

            // Body (Suit)
            g.fillStyle(0xffaa00, 1); // Orange Hazmat Suit
            g.fillCircle(32, 32, 22);
            g.lineStyle(2, 0xffffff, 0.5);
            g.strokeCircle(32, 32, 22);

            // Backpack
            g.fillStyle(0x444444, 1);
            g.fillRect(10, 20, 10, 24);
            g.fillRect(44, 20, 10, 24);

            // Head/Helmet
            g.fillStyle(0xffcc00, 1);
            g.fillCircle(32, 24, 16);

            // Visor (Glass reflection)
            g.fillStyle(0x00ffff, 0.9);
            g.beginPath();
            g.arc(32, 24, 12, 0.1, Math.PI - 0.1, false);
            g.fillPath();

            // Visor Glare
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(36, 18, 4);
        });

        // 3. Enemies - Enhanced

        // Wasp (Drone)
        generate('enemy_wasp', 48, 48, (g) => {
            // Shadow
            g.fillStyle(0x000000, 0.5);
            g.fillEllipse(24, 40, 16, 8);

            // Body
            g.fillStyle(0xcc0000, 1);
            g.fillTriangle(8, 8, 40, 8, 24, 40);

            // Engine Glow
            g.fillStyle(0xffaa00, 1);
            g.fillCircle(24, 12, 6);

            // Wings (Rotor blades)
            g.fillStyle(0xffffff, 0.6);
            g.fillEllipse(10, 10, 12, 4);
            g.fillEllipse(38, 10, 12, 4);

            // Detail
            g.lineStyle(2, 0x660000, 1);
            g.strokeTriangle(8, 8, 40, 8, 24, 40);
        });

        // Spitter (Bio-Turret)
        generate('enemy_spitter', 48, 48, (g) => {
            // Base
            g.fillStyle(0x006600, 1);
            g.fillCircle(24, 36, 16);

            // Stem
            g.fillStyle(0x00aa00, 1);
            g.fillRect(20, 20, 8, 16);

            // Head (Bulb)
            g.fillStyle(0x00ff00, 1);
            g.fillCircle(24, 16, 12);

            // Mouth/Opening
            g.fillStyle(0x003300, 1);
            g.fillCircle(24, 16, 6);

            // Spores
            g.fillStyle(0xccffcc, 0.8);
            g.fillCircle(16, 12, 2);
            g.fillCircle(32, 14, 2);
            g.fillCircle(24, 4, 2);
        });

        // Charger (Armored Beast)
        generate('enemy_charger', 56, 56, (g) => {
            // Body
            g.fillStyle(0x880088, 1);
            g.fillCircle(28, 28, 24);

            // Armor Plates
            g.fillStyle(0xcc00cc, 1);
            g.beginPath();
            g.moveTo(28, 4);
            g.lineTo(48, 20);
            g.lineTo(40, 48);
            g.lineTo(16, 48);
            g.lineTo(8, 20);
            g.closePath();
            g.fillPath();

            // Horns
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(16, 16, 8, 4, 20, 12);
            g.fillTriangle(40, 16, 48, 4, 36, 12);

            // Eyes
            g.fillStyle(0xffff00, 1);
            g.fillCircle(20, 28, 4);
            g.fillCircle(36, 28, 4);
        });

        // Exploder (Volatile Core)
        generate('enemy_exploder', 48, 48, (g) => {
            // Unstable Core
            g.fillStyle(0xff4400, 1);
            g.fillCircle(24, 24, 20);

            // Cracks/Energy
            g.lineStyle(3, 0xffff00, 1);
            g.beginPath();
            g.moveTo(24, 10); g.lineTo(24, 38);
            g.moveTo(10, 24); g.lineTo(38, 24);
            g.strokePath();

            // Pulsing outer ring
            g.lineStyle(2, 0xff0000, 0.8);
            g.strokeCircle(24, 24, 22);
        });

        // Swarm (Insect Group)
        generate('enemy_swarm', 32, 32, (g) => {
            // Multiple small entities
            const drawBug = (x: number, y: number) => {
                g.fillStyle(0xaa00aa, 1);
                g.fillCircle(x, y, 5);
                g.fillStyle(0xffffff, 0.5);
                g.fillEllipse(x - 3, y - 3, 3, 2);
                g.fillEllipse(x + 3, y - 3, 3, 2);
            };

            drawBug(16, 10);
            drawBug(10, 22);
            drawBug(22, 22);
        });

        // Shield (Guardian)
        generate('enemy_shield', 64, 64, (g) => {
            // Main Body
            g.fillStyle(0x0000aa, 1);
            g.fillRect(16, 16, 32, 32);

            // Shield Overlay
            g.lineStyle(4, 0x00ffff, 0.8);
            g.strokeRect(12, 12, 40, 40);
            g.fillStyle(0x00ffff, 0.2);
            g.fillRect(12, 12, 40, 40);

            // Cross symbol
            g.fillStyle(0xffffff, 1);
            g.fillRect(28, 20, 8, 24);
            g.fillRect(20, 28, 24, 8);
        });

        // Boss (The Guardian)
        generate('boss_guardian', 128, 128, (g) => {
            // Aura
            g.fillStyle(0x440000, 0.3);
            g.fillCircle(64, 64, 60);

            // Main Body
            g.fillStyle(0x660000, 1);
            g.fillCircle(64, 64, 48);

            // Armor
            g.lineStyle(6, 0xff0000, 1);
            g.strokeCircle(64, 64, 48);

            // Spikes
            g.fillStyle(0xaa0000, 1);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = 64 + Math.cos(angle) * 56;
                const y = 64 + Math.sin(angle) * 56;
                g.fillCircle(x, y, 10);
            }

            // Evil Face
            g.fillStyle(0xffff00, 1); // Glowing Eyes
            g.fillCircle(48, 56, 8);
            g.fillCircle(80, 56, 8);

            g.lineStyle(4, 0x000000, 1); // Mouth
            g.beginPath();
            g.moveTo(40, 80);
            g.lineTo(56, 90);
            g.lineTo(72, 80);
            g.lineTo(88, 90);
            g.strokePath();
        });

        // 4. Interactables - Enhanced

        // Chest Small
        generate('chest_small', 48, 48, (g) => {
            // Box
            g.fillStyle(0x8b4513, 1);
            g.fillRect(4, 12, 40, 28);
            // Lid
            g.fillStyle(0xa0522d, 1);
            g.fillRect(2, 8, 44, 8);
            // Lock
            g.fillStyle(0xffd700, 1);
            g.fillRect(20, 14, 8, 8);
            // Bands
            g.fillStyle(0x5c4033, 1);
            g.fillRect(8, 12, 4, 28);
            g.fillRect(36, 12, 4, 28);
        });

        // Chest Large
        generate('chest_large', 64, 64, (g) => {
            // Box
            g.fillStyle(0x5c4033, 1); // Darker wood
            g.fillRect(8, 16, 48, 36);
            // Gold Trim
            g.lineStyle(4, 0xffd700, 1);
            g.strokeRect(8, 16, 48, 36);
            // Lid
            g.fillStyle(0x8b4513, 1);
            g.beginPath();
            g.arc(32, 16, 24, Math.PI, 0, false);
            g.fillPath();
            // Gem
            g.fillStyle(0x00ff00, 1);
            g.fillCircle(32, 34, 6);
        });

        // Equipment Barrel
        generate('barrel', 40, 40, (g) => {
            // Main body
            g.fillStyle(0x708090, 1); // Slate gray
            g.fillRect(8, 4, 24, 32);
            // Ribs
            g.fillStyle(0x2f4f4f, 1);
            g.fillRect(6, 8, 28, 4);
            g.fillRect(6, 28, 28, 4);
            // Tech symbol
            g.fillStyle(0x00ffff, 1);
            g.fillCircle(20, 20, 4);
        });

        // Tri-Shop
        generate('trishop', 80, 80, (g) => {
            // Base
            g.fillStyle(0x222222, 1);
            g.fillCircle(40, 40, 36);
            g.lineStyle(3, 0x444444, 1);
            g.strokeCircle(40, 40, 36);

            // 3 Pedestals
            const drawPedestal = (angle: number) => {
                const x = 40 + Math.cos(angle) * 20;
                const y = 40 + Math.sin(angle) * 20;
                g.fillStyle(0x666666, 1);
                g.fillCircle(x, y, 10);
                g.fillStyle(0x00ff00, 0.5); // Hologram glow
                g.fillCircle(x, y, 6);
            };

            drawPedestal(0);
            drawPedestal((Math.PI * 2) / 3);
            drawPedestal((Math.PI * 4) / 3);
        });

        // Beacon (Major Objective)
        generate('beacon', 96, 96, (g) => {
            // Base
            g.fillStyle(0x333333, 1);
            g.fillCircle(48, 48, 32);

            // Rings
            g.lineStyle(4, 0x00ffff, 1);
            g.strokeCircle(48, 48, 24);
            g.lineStyle(2, 0x00ffff, 0.5);
            g.strokeCircle(48, 48, 36);

            // Core beam source
            g.fillStyle(0xffffff, 1);
            g.fillCircle(48, 48, 12);

            // Star/Antenna shape
            g.lineStyle(4, 0x00ffff, 1);
            g.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                g.moveTo(48, 48);
                g.lineTo(48 + Math.cos(angle) * 40, 48 + Math.sin(angle) * 40);
            }
            g.strokePath();
        });

        // Altar of the Apex
        generate('altar', 80, 80, (g) => {
            // Pyramid shape
            g.fillStyle(0x4b0082, 1); // Indigo
            g.beginPath();
            g.moveTo(40, 10);
            g.lineTo(70, 70);
            g.lineTo(10, 70);
            g.closePath();
            g.fillPath();

            // Eye
            g.fillStyle(0xffd700, 1);
            g.fillCircle(40, 45, 10);
            g.fillStyle(0xff0000, 1); // Pupil
            g.fillCircle(40, 45, 4);

            // Glow
            g.lineStyle(2, 0xff00ff, 0.5);
            g.strokeTriangle(10, 70, 70, 70, 40, 10);
        });

        // 5. Projectiles - Enhanced

        // Player Projectile (Plasma Bolt)
        generate('projectile_player', 24, 24, (g) => {
            // Core
            g.fillStyle(0xffff00, 1);
            g.fillCircle(12, 12, 6);
            // Glow
            g.fillStyle(0xffaa00, 0.4);
            g.fillCircle(12, 12, 10);
            // Trail hint
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(10, 10, 3);
        });

        // Enemy Projectile (Spore/Acid)
        generate('projectile_enemy', 24, 24, (g) => {
            g.fillStyle(0x00ff00, 1);
            g.fillCircle(12, 12, 6);
            // Bubbles
            g.fillStyle(0xccffcc, 0.6);
            g.fillCircle(14, 10, 2);
            g.fillCircle(10, 14, 2);
        });

        // Boss Projectile (Dark Energy)
        generate('projectile_boss', 48, 48, (g) => {
            g.fillStyle(0x800080, 1);
            g.fillCircle(24, 24, 16);
            g.lineStyle(2, 0xff00ff, 1);
            g.strokeCircle(24, 24, 14);
            // Core
            g.fillStyle(0x000000, 1);
            g.fillCircle(24, 24, 8);
        });
    }

    private createExplosion(x: number, y: number, color: number = 0xff4400): void {
        // Create explosion particles
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const particle = this.add.circle(x, y, Math.random() * 4 + 2, color);
            particle.setDepth(10);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: Math.random() * 500 + 300,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Flash effect
        const flash = this.add.circle(x, y, 40, 0xffffff, 0.8);
        flash.setDepth(9);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => flash.destroy()
        });
    }

    private createProjectileHit(x: number, y: number, color: number): void {
        // Create hit sparks
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 50 + 20;
            const particle = this.add.circle(x, y, Math.random() * 3 + 1, color);
            particle.setDepth(10);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: Math.random() * 300 + 100,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    private createLevelUpEffect(x: number, y: number): void {
        // Rising particles
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            const particle = this.add.circle(x + offsetX, y + offsetY, Math.random() * 3 + 2, 0xffff00);
            particle.setDepth(10);

            this.tweens.add({
                targets: particle,
                y: y - 100 - Math.random() * 50,
                alpha: 0,
                duration: Math.random() * 1000 + 500,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Pillar of light
        const pillar = this.add.rectangle(x, y, 40, 200, 0xffff00, 0.3);
        pillar.setOrigin(0.5, 1);
        pillar.setDepth(5);
        this.tweens.add({
            targets: pillar,
            scaleX: 0,
            alpha: 0,
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => pillar.destroy()
        });
    }

    async create() {
        // Generate procedural textures immediately
        this.createProceduralTextures();

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

                // Add tiled background
                const background = this.add.tileSprite(0, 0, state.worldWidth, state.worldHeight, 'ground_tile');
                background.setOrigin(0, 0);
                background.setDepth(-2); // Behind everything

                // Add a background to represent the world bounds (overlay for tint)
                const worldBackground = this.add.rectangle(0, 0, state.worldWidth, state.worldHeight, 0x000000).setOrigin(0);
                worldBackground.setAlpha(0.3); // Darken the ground slightly
                worldBackground.setStrokeStyle(4, 0x666699);
                worldBackground.setDepth(-1); // Ensure background is behind everything else

                // Set camera bounds and follow player
                this.cameras.main.setBounds(0, 0, state.worldWidth, state.worldHeight);

                const $ = getStateCallbacks(this.room);

                $(this.room.state).players.onAdd((_player, sessionId) => {
                    console.log(`Adding player: ${sessionId} at (${_player.x}, ${_player.y})`);
                    const sprite = this.add.sprite(_player.x, _player.y, 'researcher_lemur');
                    sprite.setDisplaySize(48, 48); // Scale to appropriate size
                    const entity = this.physics.add.existing(sprite, false);
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
                            this.UI_CONFIG.LEFT_SIDEBAR_WIDTH / 2,
                            this.UI_CONFIG.VIEWPORT_HEIGHT / 2,
                            this.UI_CONFIG.LEFT_SIDEBAR_WIDTH,
                            this.UI_CONFIG.VIEWPORT_HEIGHT,
                            0x000000
                        );
                        leftSidebarBg.setAlpha(0.8);
                        leftSidebarBg.setScrollFactor(0);
                        leftSidebarBg.setDepth(30);

                        // Create right sidebar background for inventory
                        const rightSidebarBg = this.add.rectangle(
                            this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH / 2,
                            this.UI_CONFIG.VIEWPORT_HEIGHT / 2,
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
                        // Calculate rotation based on movement
                        if (_player.x !== entity.x || _player.y !== entity.y) {
                            const angle = Phaser.Math.Angle.Between(entity.x, entity.y, _player.x, _player.y);
                            entity.rotation = angle;
                        }
                        entity.x = _player.x;
                        entity.y = _player.y;

                        // Debug camera following for local player
                        if (sessionId === this.room.sessionId) {
                            console.log(`Local player position: (${entity.x}, ${entity.y})`);
                            console.log(`Camera position: (${this.cameras.main.scrollX}, ${this.cameras.main.scrollY})`);
                        }

                        if (sessionId === this.room.sessionId) {
                            // Cap health display at maximum to prevent showing over max (e.g., 120/100)
                            const currentHealth = Math.min(Math.round(_player.health), Math.round(_player.calculatedMaxHealth));
                            this.playerHealthText.setText(`Health: ${currentHealth}/${Math.round(_player.calculatedMaxHealth)}`);

                            // Update level and XP display
                            const xpForNextLevel = Math.floor(100 * Math.pow(1.2, _player.level));
                            this.levelText.setText(`⭐ LEVEL: ${_player.level}\n💎 XP: ${_player.xp}/${xpForNextLevel}`);

                            // Level up effect
                            const previousLevel = entity.getData('previousLevel') || _player.level;
                            if (_player.level > previousLevel) {
                                this.createLevelUpEffect(entity.x, entity.y);
                                this.showPickupMessage(`⭐ LEVEL UP! Reached Level ${_player.level}`);
                            }
                            entity.setData('previousLevel', _player.level);

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
                                entity.setTint(0xff0000);
                                this.time.delayedCall(100, () => {
                                    entity.clearTint(); // Original player color
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
                                if (entity) {
                                    (entity as any).clearTint?.();
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
                    let borderColor = 0xff0000; // Red border for regular enemies

                    let enemyImageKey = 'enemy_wasp'; // Default
                    if (enemy.typeId === "spitter") {
                        enemyImageKey = 'enemy_spitter';
                        healthBarColor = 0xff0000;
                    } else if (enemy.typeId === "charger") {
                        enemyImageKey = 'enemy_charger';
                        healthBarColor = 0x00ff00;
                    } else if (enemy.typeId === "exploder") {
                        enemyImageKey = 'enemy_exploder';
                        healthBarColor = 0xff6600;
                        enemySize = 32;
                    } else if (enemy.typeId === "swarm") {
                        enemyImageKey = 'enemy_swarm';
                        healthBarColor = 0xda70d6;
                        enemySize = 20;
                    } else if (enemy.typeId === "shield") {
                        enemyImageKey = 'enemy_shield';
                        healthBarColor = 0x1e90ff;
                        enemySize = 34;
                    } else if (enemy.typeId === "boss_guardian") {
                        enemyImageKey = 'boss_guardian';
                        enemySize = 64;
                    }

                    // Apply Elite enemy visual enhancements
                    if (isElite) {
                        enemySize = 36; // Larger size for elite enemies

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

                    // Create sprite instead of rectangle
                    const enemySprite = this.add.sprite(enemy.x, enemy.y, enemyImageKey);
                    enemySprite.setDisplaySize(enemySize, enemySize);

                    // Add border/tint for elites since we can't stroke a sprite easily
                    if (isElite) {
                        enemySprite.setTint(enemyColor);
                    }

                    const entity = this.physics.add.existing(enemySprite, false);
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
                        const aura = this.add.circle(enemy.x, enemy.y, auraSize / 2, 0xffffff);
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
                        // Calculate rotation
                        if (enemy.x !== entity.x || enemy.y !== entity.y) {
                            const angle = Phaser.Math.Angle.Between(entity.x, entity.y, enemy.x, enemy.y);
                            entity.rotation = angle;
                        }
                        // Update position - this fixes the charger movement bug
                        entity.x = enemy.x;
                        entity.y = enemy.y;

                        // Visual feedback for charger's charging state
                        if (enemy.typeId === "charger") {
                            if (enemy.isCharging) {
                                entity.setTint(0xffff00); // Yellow color during charge
                            } else {
                                entity.clearTint(); // Original charger color
                                // Re-apply elite tint if needed
                                if (isElite) entity.setTint(enemyColor);
                            }
                        }

                        // Visual feedback for exploder's explosion state
                        if (enemy.typeId === "exploder") {
                            if (enemy.isExploding) {
                                entity.setTint(0xffffff); // White when about to explode
                                entity.setScale(1.5); // Pulsing effect
                                // Add rapid pulsing
                                this.tweens.add({
                                    targets: entity,
                                    scaleX: 1.8,
                                    scaleY: 1.8,
                                    duration: 100,
                                    yoyo: true,
                                    repeat: -1
                                });
                            } else {
                                entity.clearTint(); // Original exploder color
                                // Re-apply elite tint if needed
                                if (isElite) entity.setTint(enemyColor);
                                entity.setScale(1);
                            }
                        }

                        // Visual feedback for shield state
                        if (enemy.typeId === "shield") {
                            if (enemy.shieldActive) {
                                // entity.setStrokeStyle(6, 0x00ffff); // Sprites don't support stroke
                                entity.setTint(0x00ffff); // Cyan tint when shield is active
                            } else {
                                // entity.setStrokeStyle(4, 0xff0000); // Sprites don't support stroke
                                entity.clearTint();
                                // Re-apply elite tint if needed
                                if (isElite) entity.setTint(enemyColor);
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
                        entity.destroy();
                        delete this.enemyEntities[sessionId];

                        // Explosion effect
                        this.createExplosion(entity.x, entity.y, 0xff4400);

                        // Increment enemy defeat counter for beacon progress tracking
                        this.enemiesDefeatedCount++;
                        console.log(`🎯 Enemies defeated: ${this.enemiesDefeatedCount}/3 (Beacon spawns at 3)`);
                    }
                });

                $(this.room.state).projectiles.onAdd((projectile, projectileId) => {
                    console.log(`Adding projectile: ${projectileId} of type ${projectile.projectileType} at (${projectile.x}, ${projectile.y})`);

                    let projectileImage = 'projectile_player'; // Default
                    let projectileSize = 16; // Default size
                    if (projectile.projectileType === "spitterProjectile") {
                        projectileImage = 'projectile_enemy';
                        projectileSize = 28; // Much larger size for better visibility
                    } else if (projectile.projectileType === "bossProjectile") {
                        projectileImage = 'projectile_boss';
                        projectileSize = 40;
                    }

                    const projectileSprite = this.add.sprite(projectile.x, projectile.y, projectileImage);
                    projectileSprite.setDisplaySize(projectileSize, projectileSize);
                    projectileSprite.setDepth(999); // Ensure it's always on top

                    // Add pulsing glow effect for spitter projectiles
                    if (projectile.projectileType === "spitterProjectile") {
                        this.tweens.add({
                            targets: projectileSprite,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            duration: 500,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }

                    console.log(`DEBUG Client: Projectile ${projectileId} created. Active: ${projectileSprite.active}, Visible: ${projectileSprite.visible}, Depth: ${projectileSprite.depth}, Pos: (${projectileSprite.x}, ${projectileSprite.y})`);
                    this.projectileEntities[projectileId] = projectileSprite;

                    $(projectile).onChange(() => {
                        projectileSprite.x = projectile.x;
                        projectileSprite.y = projectile.y;
                        projectileSprite.rotation = projectile.rotation;

                    });
                });

                $(this.room.state).projectiles.onRemove((projectile, projectileId) => {
                    console.log(`Removing projectile: ${projectileId}. Final TTL: ${projectile.timeToLive.toFixed(2)}`);

                    const entity = this.projectileEntities[projectileId];
                    if (entity) {
                        entity.destroy();
                        entity.destroy();
                        delete this.projectileEntities[projectileId];

                        // Hit effect
                        this.createProjectileHit(entity.x, entity.y, 0xffff00);
                    }
                });

                // Interactables rendering
                $(this.room.state).interactables.onAdd((interactable, interactableId) => {
                    console.log(`Adding interactable: ${interactableId} of type ${interactable.type} at (${interactable.x}, ${interactable.y})`);

                    // Use sprites for interactables
                    let itemSpriteKey = 'chest_small';
                    let itemSize = 40;

                    switch (interactable.type) {
                        case "smallChest":
                            itemSpriteKey = 'chest_small';
                            itemSize = 32;
                            break;
                        case "largeChest":
                            itemSpriteKey = 'chest_large';
                            itemSize = 40;
                            break;
                        case "equipmentBarrel":
                            itemSpriteKey = 'barrel';
                            itemSize = 32;
                            break;
                        case "triShop":
                            itemSpriteKey = 'trishop';
                            itemSize = 48;
                            break;
                        case "whisperingTotem":
                            itemSpriteKey = 'altar'; // Reusing altar for now or generate totem
                            itemSize = 40;
                            break;
                        case "altarOfTheApex":
                            itemSpriteKey = 'altar';
                            itemSize = 64;
                            break;
                        case "bioResonanceBeacon":
                            itemSpriteKey = 'beacon';
                            itemSize = 96; // Make beacon large
                            break;
                    }

                    const itemSprite = this.add.sprite(interactable.x, interactable.y, itemSpriteKey);
                    itemSprite.setDisplaySize(itemSize, itemSize);
                    itemSprite.setDepth(2);

                    if (interactable.type === "bioResonanceBeacon" || interactable.type === "altarOfTheApex") {
                        itemSprite.setDepth(5);
                    }

                    this.interactableEntities[interactableId] = itemSprite;

                    // Add floating effect
                    this.tweens.add({
                        targets: itemSprite,
                        y: (itemSprite as any).y - 5,
                        duration: 1000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });

                    $(interactable).onChange(() => {
                        if (interactable.isOpen) {
                            // Visual feedback for opened interactable
                            (itemSprite as any).setTint(0x444444); // Darken when opened
                            (itemSprite as any).setAlpha(0.5); // Semi-transparent
                        } else {
                            // Restore original appearance
                            (itemSprite as any).clearTint();
                            (itemSprite as any).setAlpha(1);
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

                // Initialize beacon direction indicator
                this.createBeaconDirectionIndicator();

            });

        } catch (e) {
            console.error('Join error', e);
        }
    }

    private createBeaconDirectionIndicator(): void {
        const rightSidebarX = this.UI_CONFIG.VIEWPORT_WIDTH - this.UI_CONFIG.RIGHT_SIDEBAR_WIDTH + 10;
        const beaconY = 80; // Position below health text

        // Create text showing distance and direction to beacon
        this.beaconDirectionText = this.add.text(rightSidebarX, beaconY, '🌟 BEACON: Finding...', {
            fontSize: '14px',
            color: '#00ff00',
            backgroundColor: 'rgba(0,100,0,0.8)',
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

        // Create a simple arrow indicator (will be updated in update loop)
        this.beaconArrow = this.add.triangle(
            rightSidebarX + 150, beaconY + 15,
            0, -8,  // Top point
            -6, 8,  // Bottom left
            6, 8    // Bottom right
        ).setFillStyle(0x00ff00).setScrollFactor(0).setDepth(101);

        console.log('🧭 Created beacon direction indicator');
    }

    private updateBeaconDirection(): void {
        if (!this.beaconDirectionText || !this.beaconArrow || !this.room) {
            return;
        }

        // Get the local player entity
        const playerEntity = this.playerEntities[this.room.sessionId];
        if (!playerEntity) {
            return;
        }

        // Find the beacon in the interactables
        let beaconX = 0;
        let beaconY = 0;
        let beaconFound = false;

        for (const [, interactable] of this.room.state.interactables) {
            if (interactable.type === "bioResonanceBeacon") {
                beaconX = interactable.x;
                beaconY = interactable.y;
                beaconFound = true;
                break;
            }
        }

        if (!beaconFound) {
            // Check if server should have spawned beacon already
            const enemiesDefeated = this.getEnemiesDefeatedCount();
            const enemiesNeeded = 3; // Server spawns beacon after 3 enemies defeated

            if (enemiesDefeated >= enemiesNeeded) {
                this.beaconDirectionText.setText('🌟 BEACON: Looking for beacon...');
                this.beaconArrow.setVisible(false);
            } else {
                this.beaconDirectionText.setText(`⚔️ DEFEAT ENEMIES: ${enemiesDefeated}/${enemiesNeeded} to spawn beacon`);
                this.beaconArrow.setVisible(false);
            }
            return;
        }

        // Calculate distance and direction from player to beacon
        const dx = beaconX - playerEntity.x;
        const dy = beaconY - playerEntity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Update text with distance
        if (distance < 100) {
            this.beaconDirectionText.setText('🌟 BEACON: Nearby!');
            this.beaconArrow.setVisible(false);
        } else {
            this.beaconDirectionText.setText(`🌟 BEACON: ${Math.floor(distance)}m`);
            this.beaconArrow.setVisible(true);

            // Calculate angle and rotate arrow
            let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90; // +90 to point up

            // Update arrow rotation
            this.beaconArrow.setRotation(angle * Math.PI / 180);
        }
    }

    private getEnemiesDefeatedCount(): number {
        return this.enemiesDefeatedCount;
    }

    update() {
        if (!this.room) {
            return;
        }

        // Update stage information periodically
        if (this.time.now % 1000 < 16) { // Update roughly every second
            this.updateStageInformation();
        }

        // Update beacon direction indicator
        this.updateBeaconDirection();

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
