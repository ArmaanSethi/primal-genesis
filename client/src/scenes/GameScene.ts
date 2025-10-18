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

            const $ = getStateCallbacks(this.room);

            $(this.room.state).players.onAdd((player, sessionId) => {
                console.log(`Adding player: ${sessionId}`);
                const entity = this.add.rectangle(player.x, player.y, 32, 32, 0xff0000);
                this.playerEntities[sessionId] = entity;

                $(player).onChange(() => {
                    entity.x = player.x;
                    entity.y = player.y;
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
                console.log(`Adding enemy: ${sessionId}`);
                const entity = this.add.rectangle(enemy.x, enemy.y, 32, 32, 0x0000ff);
                this.enemyEntities[sessionId] = entity;

                $(enemy).onChange(() => {
                    entity.x = enemy.x;
                    entity.y = enemy.y;
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

        } catch (e) {
            console.error('Join error', e);
        }
    }

    update() {
        if (!this.room) {
            return;
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

        this.room.send('input', this.inputPayload);
    }
}
