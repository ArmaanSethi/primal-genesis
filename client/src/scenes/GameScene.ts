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

                // Add a prominent grid for debugging
                const graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xffffff, alpha: 1 } });
                const gridSize = 128;
                for (let x = 0; x < state.worldWidth; x += gridSize) {
                    graphics.lineBetween(x, 0, x, state.worldHeight);
                }
                for (let y = 0; y < state.worldHeight; y += gridSize) {
                    graphics.lineBetween(0, y, state.worldWidth, y);
                }
                graphics.setDepth(-1);

                // Set camera bounds and follow player
                this.cameras.main.setBounds(0, 0, state.worldWidth, state.worldHeight);

                const $ = getStateCallbacks(this.room);

                $(this.room.state).players.onAdd((player, sessionId) => {
                                                    console.log(`Adding player: ${sessionId} at (${player.x}, ${player.y})`);
                                                    const graphics = this.add.graphics({ fillStyle: { color: 0xff0000 } });
                                                    graphics.fillRect(0, 0, 32, 32);
                                                    const entity = this.physics.add.existing(graphics, false) as Phaser.Physics.Arcade.Image;
                                                    entity.setPosition(player.x, player.y);
                                                    this.playerEntities[sessionId] = entity;
                                    
                                                    // Make camera follow this client's player
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
                                                    const graphics = this.add.graphics({ fillStyle: { color: 0x0000ff } });
                                                    graphics.fillRect(0, 0, 32, 32);
                                                    const entity = this.physics.add.existing(graphics, false) as Phaser.Physics.Arcade.Image;
                                                    entity.setPosition(enemy.x, enemy.y);
                                                    this.enemyEntities[sessionId] = entity;
                                    
                                                    $(enemy).onChange(() => {
                                                        entity.x = enemy.x;
                                                        entity.y = enemy.y;
                                                        console.log(`Enemy ${sessionId} updated to (${enemy.x}, ${enemy.y})`);
                                                    });
                });

                $(this.room.state).enemies.onRemove((enemy, sessionId) => {
                    console.log(`Removing enemy: ${sessionId}`);
                    const entity = this.enemyEntities[sessionId];
                    if (entity) {
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
