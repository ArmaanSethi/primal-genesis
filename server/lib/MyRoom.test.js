"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@colyseus/testing");
const chai_1 = require("chai");
const app_config_1 = __importDefault(require("./app.config"));
const MyRoomState_1 = require("./rooms/schema/MyRoomState");
describe("MyRoom Integration Tests", () => {
    let colyseus;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        colyseus = yield (0, testing_1.boot)(app_config_1.default);
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield colyseus.shutdown();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield colyseus.cleanup();
    }));
    it("should add a player on join", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch(); // Wait for state to sync
        chai_1.assert.isTrue(room.state.players.has(client.sessionId));
        chai_1.assert.equal(room.state.players.size, 1);
    }));
    it("should remove a player on leave", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        chai_1.assert.equal(room.state.players.size, 1);
        yield client.leave();
        // Wait a short moment for the server to process the leave event
        yield new Promise(resolve => setTimeout(resolve, 50));
        chai_1.assert.equal(room.state.players.size, 0);
    }));
    it("should initialize player with correct base stats", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        chai_1.assert.equal(player.maxHealth, 100);
        chai_1.assert.equal(player.damage, 12);
    }));
    it("should update player position on input", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        const initialX = player.x;
        const initialY = player.y;
        client.send("input", { x: 1, y: -1 });
        // Wait for the next server tick
        yield room.waitForNextPatch();
        chai_1.assert.isAbove(player.x, initialX);
        chai_1.assert.isBelow(player.y, initialY);
    }));
    it("should move enemies towards the player", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        player.x = 400;
        player.y = 300;
        // Manually create and position a waspDrone enemy for testing
        const enemy = new MyRoomState_1.Enemy();
        enemy.id = "testWaspDrone";
        enemy.typeId = "waspDrone";
        enemy.x = 0;
        enemy.y = 0;
        room.state.enemies.set(enemy.id, enemy);
        yield room.waitForNextPatch(); // Sync state with the new enemy
        const initialDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        yield room.waitForNextPatch(); // Process one tick
        const newDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        chai_1.assert.isBelow(newDistance, initialDistance);
    }));
    it("should create a projectile when player attacks an enemy", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        // Manually create and position an enemy for testing
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        player.x = 100;
        player.y = 100;
        // Manually create and position an enemy for testing
        const enemy = new MyRoomState_1.Enemy();
        enemy.id = "testEnemy";
        enemy.typeId = "waspDrone";
        enemy.x = player.x + 10; // Very close to the player
        enemy.y = player.y;
        room.state.enemies.set(enemy.id, enemy);
        yield room.waitForNextPatch(); // Wait for state to sync
        player.attackCooldown = 0; // Ensure player can attack immediately
        player.attackSpeed = 1; // 1 attack per second
        player.projectileSpeed = 100; // Explicitly set projectile speed
        player.damage = 10; // Explicitly set player damage
        // Advance time to allow attack cooldown to reset and attack to occur
        for (let i = 0; i < 100; i++) { // Simulate enough ticks for attack to occur
            yield room.waitForNextPatch();
            if (room.state.projectiles.size > 0)
                break; // Break once projectile is created
        }
        chai_1.assert.isAbove(room.state.projectiles.size, 0, "Projectile should be created");
    })).timeout(10000); // Explicitly set timeout to 10 seconds
    it("should move projectiles and remove them when they hit an enemy", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        player.x = 100;
        player.y = 100;
        player.attackCooldown = 0; // Ensure player can attack immediately
        player.attackSpeed = 1; // 1 attack per second
        // Manually create and position an enemy for testing
        const enemy = new MyRoomState_1.Enemy();
        enemy.id = "testEnemy";
        enemy.typeId = "waspDrone";
        enemy.x = player.x + 200; // Away from the player for projectile travel
        enemy.y = player.y;
        enemy.maxHealth = 20;
        enemy.health = 20;
        enemy.damage = 5; // Enemy damage (not relevant for this test)
        enemy.moveSpeed = 1; // Enemy move speed (not relevant for this test)
        room.state.enemies.set(enemy.id, enemy);
        yield room.waitForNextPatch(); // Sync state with the new enemy
        const initialEnemyHealth = enemy.health;
        // Advance time to allow player to fire a projectile
        for (let i = 0; i < 50; i++) { // Simulate enough ticks for attack to occur
            yield room.waitForNextPatch();
            if (room.state.projectiles.size > 0)
                break; // Break once projectile is created
        }
        chai_1.assert.isAbove(room.state.projectiles.size, 0, "Projectile should be created");
        const projectile = room.state.projectiles.values().next().value;
        chai_1.assert.exists(projectile);
        // Advance time until projectile hits enemy
        for (let i = 0; i < 150; i++) { // Simulate enough ticks for collision
            yield room.waitForNextPatch();
            if (room.state.projectiles.size === 0)
                break; // Projectile removed on hit
        }
        chai_1.assert.equal(room.state.projectiles.size, 0, "Projectile should be removed after hitting enemy");
        chai_1.assert.isBelow(enemy.health, initialEnemyHealth, "Enemy health should be reduced");
    })).timeout(15000); // Explicitly set timeout to 15 seconds
    it("should continuously spawn enemies up to the maximum limit", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {}); // Connect a player
        yield room.waitForNextPatch();
        // Wait for the player to be added to the room state
        for (let i = 0; i < 10; i++) {
            yield room.waitForNextPatch();
            if (room.state.players.has(client.sessionId))
                break;
        }
        chai_1.assert.isTrue(room.state.players.has(client.sessionId), "Player should be in the room state");
        // Clear initial enemy to test spawning from scratch
        room.state.enemies.clear();
        yield room.waitForNextPatch();
        // Simulate 100 ticks (approx 1.66 seconds for 60FPS, or 1 second for 10ms deltaTime)
        for (let i = 0; i < 100; i++) {
            yield room.waitForNextPatch();
        }
        chai_1.assert.equal(room.state.enemies.size, 2, `Should spawn 2 enemies`);
    })).timeout(90000); // Increase timeout to 90 seconds
});
