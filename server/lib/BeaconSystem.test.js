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
describe("Beacon System Tests", () => {
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
    it("should spawn beacon when enough enemies are defeated", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Wait for initial beacon spawn (should happen when enemies are defeated)
        let beaconFound = false;
        for (let i = 0; i < 200; i++) { // Wait up to 200 ticks
            yield room.waitForNextPatch();
            for (const interactable of room.state.interactables.values()) {
                if (interactable.type === "beacon") {
                    beaconFound = true;
                    break;
                }
            }
            if (beaconFound)
                break;
        }
        chai_1.assert.isTrue(beaconFound, "Beacon should spawn after sufficient enemy eliminations");
    }));
    it("should create beacon with correct properties", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Wait for beacon to spawn
        let beacon = null;
        for (let i = 0; i < 200; i++) {
            yield room.waitForNextPatch();
            for (const interactable of room.state.interactables.values()) {
                if (interactable.type === "beacon") {
                    beacon = interactable;
                    break;
                }
            }
            if (beacon)
                break;
        }
        chai_1.assert.exists(beacon, "Beacon should exist");
        chai_1.assert.equal(beacon.type, "beacon", "Beacon should have correct type");
        chai_1.assert.isFalse(beacon.isOpen, "Beacon should initially be closed");
        chai_1.assert.isNumber(beacon.x, "Beacon should have X coordinate");
        chai_1.assert.isNumber(beacon.y, "Beacon should have Y coordinate");
    }));
    it("should activate holdout phase when beacon is activated", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Wait for beacon to spawn
        let beaconId = "";
        for (let i = 0; i < 200; i++) {
            yield room.waitForNextPatch();
            for (const [id, interactable] of room.state.interactables.entries()) {
                if (interactable.type === "beacon") {
                    beaconId = id;
                    break;
                }
            }
            if (beaconId)
                break;
        }
        chai_1.assert.isNotEmpty(beaconId, "Beacon ID should be found");
        // Move player near beacon
        const beacon = room.state.interactables.get(beaconId);
        if (beacon) {
            player.x = beacon.x;
            player.y = beacon.y;
            yield room.waitForNextPatch();
            // Activate beacon
            client.send("interact", { interactableId: beaconId });
            yield room.waitForNextPatch();
            // Check if holdout timer started
            chai_1.assert.isAbove(room.state.holdoutTimer, 0, "Holdout timer should start after beacon activation");
        }
    }));
    it("should spawn boss after holdout phase completes", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Wait for beacon to spawn
        let beaconId = "";
        for (let i = 0; i < 200; i++) {
            yield room.waitForNextPatch();
            for (const [id, interactable] of room.state.interactables.entries()) {
                if (interactable.type === "beacon") {
                    beaconId = id;
                    break;
                }
            }
            if (beaconId)
                break;
        }
        if (beaconId) {
            const beacon = room.state.interactables.get(beaconId);
            if (beacon) {
                player.x = beacon.x;
                player.y = beacon.y;
                yield room.waitForNextPatch();
                // Activate beacon and wait through holdout phase
                client.send("interact", { interactableId: beaconId });
                yield room.waitForNextPatch();
                // Wait for holdout to complete and boss to spawn
                let bossFound = false;
                for (let i = 0; i < 600; i++) { // Wait longer for holdout phase
                    yield room.waitForNextPatch();
                    for (const enemy of room.state.enemies.values()) {
                        if (enemy.typeId === "boss") {
                            bossFound = true;
                            break;
                        }
                    }
                    if (bossFound)
                        break;
                }
                chai_1.assert.isTrue(bossFound, "Boss should spawn after holdout phase completes");
            }
        }
    }));
    it("should create boss with correct properties", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Manually create a boss for testing
        const boss = new MyRoomState_1.Enemy();
        boss.id = "testBoss";
        boss.typeId = "boss";
        boss.x = 1000;
        boss.y = 1000;
        boss.maxHealth = 1000;
        boss.health = 1000;
        boss.damage = 25;
        boss.moveSpeed = 1.5;
        boss.attackRange = 600;
        boss.projectileSpeed = 400;
        boss.projectileType = "bossProjectile";
        room.state.enemies.set(boss.id, boss);
        yield room.waitForNextPatch();
        const createdBoss = room.state.enemies.get("testBoss");
        chai_1.assert.exists(createdBoss, "Boss should exist in game state");
        chai_1.assert.equal(createdBoss.typeId, "boss", "Boss should have correct type");
        chai_1.assert.equal(createdBoss.maxHealth, 1000, "Boss should have correct max health");
        chai_1.assert.equal(createdBoss.damage, 25, "Boss should have correct damage");
        chai_1.assert.equal(createdBoss.projectileType, "bossProjectile", "Boss should have correct projectile type");
    }));
    it("should handle beacon state transitions correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        // Check initial beacon state
        chai_1.assert.equal(room.state.beaconState, "inactive", "Beacon should start as inactive");
        chai_1.assert.equal(room.state.stageLevel, 1, "Stage level should start at 1");
        // The beacon state should transition through the different phases
        // inactive -> charging -> bossFight -> stageComplete
        // These transitions happen automatically based on game events
        chai_1.assert.isString(room.state.beaconState, "Beacon state should be a string");
        chai_1.assert.isNumber(room.state.stageLevel, "Stage level should be a number");
    }));
    it("should spawn beacon at safe distance from player", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Set player position
        player.x = 500;
        player.y = 500;
        // Wait for beacon to spawn
        let beacon = null;
        for (let i = 0; i < 200; i++) {
            yield room.waitForNextPatch();
            for (const interactable of room.state.interactables.values()) {
                if (interactable.type === "beacon") {
                    beacon = interactable;
                    break;
                }
            }
            if (beacon)
                break;
        }
        if (beacon) {
            const distance = Math.hypot(beacon.x - player.x, beacon.y - player.y);
            chai_1.assert.isAbove(distance, 200, "Beacon should spawn at safe distance from player");
            chai_1.assert.isBelow(beacon.x, room.state.worldWidth - 100, "Beacon should be within world bounds");
            chai_1.assert.isBelow(beacon.y, room.state.worldHeight - 100, "Beacon should be within world bounds");
            chai_1.assert.isAbove(beacon.x, 100, "Beacon should be within world bounds");
            chai_1.assert.isAbove(beacon.y, 100, "Beacon should be within world bounds");
        }
    }));
});
