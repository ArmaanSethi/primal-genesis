import Phaser from 'phaser';
import { Client, Room, getStateCallbacks } from 'colyseus.js';

// Use the 'type' keyword to import the server-side schema for type-checking
import type { MyRoomState } from '../../../server/src/rooms/schema/MyRoomState';

export class GameScene extends Phaser.Scene {
    private room: Room<MyRoomState>;
    private playerEntities: { [sessionId: string]: Phaser.GameObjects.Rectangle } = {};
    private enemyEntities: { [sessionId: string]: Phaser.GameObjects.Rectangle } = {};

    // Input keys
    private keyW: Phaser.Input.Keyboard.Key;
    private keyA: Phaser.Input.Keyboard.Key;
    private keyS: Phaser.Input.Keyboard.Key;
    private keyD: Phaser.Input.Keyboard.Key;

    private inputPayload = { x: 0, y: 0 };

    constructor() {
        super({ key: 'GameScene' });
    }

    private createHealthBar(width: number, height: number, color: number): Phaser.GameObjects.Graphics {
        const healthBar = this.add.graphics();
        healthBar.fillStyle(color, 1);
        healthBar.fillRect(0, 0, width, height);
        return healthBar;
    }

    init() {
        // This is a standard lifecycle method, it should not be async.
    }

    preload() {
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    async create() {
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

                $(this.room.state).players.onAdd((player, sessionId) => {
                console.log(`Adding player: ${sessionId} at (${player.x}, ${player.y})`);
                const rect = this.add.rectangle(player.x, player.y, 32, 32, 0xff0000);
                const entity = this.physics.add.existing(rect, false) as Phaser.Physics.Arcade.Sprite;
                entity.setDepth(0); // Explicitly set depth
                this.playerEntities[sessionId] = entity;                                                    // Make camera follow this client's player
                                                    if (sessionId === this.room.sessionId) {
                                                        console.log(`Camera: Starting to follow local player ${sessionId}. Entity:`, entity);
                                                        this.cameras.main.startFollow(entity);
                                                    }
                                    
                                                    $(player).onChange(() => {
                                                        entity.x = player.x;
                                                        entity.y = player.y;
                                                        // console.log(`Player ${sessionId} updated to (${player.x}, ${player.y})`); // Keep this commented for now
                                                    });
                                                });
                                    
                                                $(this.room.state).players.onRemove((player, sessionId) => {
                                                    console.log(`Removing player: ${sessionId}`);
                                                    const entity = this.playerEntities[sessionId];
                                                    if (entity) {
                                                        entity.destroy();
                                                        delete this.playerEntities[sessionId];
                                                    }
                                                });
                                    
            $(this.room.state).enemies.onAdd((enemy, sessionId) => {
                console.log(`Adding enemy: ${sessionId} at (${enemy.x}, ${enemy.y})`);
                const rect = this.add.rectangle(enemy.x, enemy.y, 32, 32, 0x0000ff);
                const entity = this.physics.add.existing(rect, false) as Phaser.Physics.Arcade.Sprite;
                entity.setDepth(0); // Explicitly set depth
                this.enemyEntities[sessionId] = entity;

                // Create health bar
                const healthBar = this.createHealthBar(32, 4, 0x00ff00);
                healthBar.setDepth(1); // Health bar on top of enemy
                healthBar.x = enemy.x - 16;
                healthBar.y = enemy.y - 20;
                entity.setData('healthBar', healthBar);

                $(enemy).onChange(() => {
                    // Visual feedback for damage
                    if (enemy.health < enemy.maxHealth) {
                        const entity = this.enemyEntities[sessionId];
                        if (entity) {
                            entity.setTint(0xff0000); // Red tint for damage
                            this.time.delayedCall(100, () => {
                                entity.clearTint();
                            });
                        }
                    }
                    entity.x = enemy.x;
                    entity.y = enemy.y;

                    // Update health bar position and width
                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                    healthBar.x = entity.x - 16;
                    healthBar.y = entity.y - 20;
                    healthBar.clear();
                    healthBar.fillStyle(0x00ff00, 1);
                    healthBar.fillRect(0, 0, (enemy.health / enemy.maxHealth) * 32, 4);
                });
            });

            $(this.room.state).enemies.onRemove((enemy, sessionId) => {
                console.log(`Removing enemy: ${sessionId}`);
                const entity = this.enemyEntities[sessionId];
                if (entity) {
                    const healthBar = entity.getData('healthBar') as Phaser.GameObjects.Graphics;
                    healthBar.destroy();
                    entity.destroy();
                    delete this.enemyEntities[sessionId];
                }
            });
            });

        } catch (e) {
            console.error('Join error', e);
        }
    }

    update() {
        if (!this.room) {
            return;
        }

        // Log camera state
        console.log(`Camera: x=${this.cameras.main.scrollX}, y=${this.cameras.main.scrollY}, zoom=${this.cameras.main.zoom}`);

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

        this.room.send('input', this.inputPayload);
    }
}
