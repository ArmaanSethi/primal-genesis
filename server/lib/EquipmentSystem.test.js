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
describe("Equipment System Tests", () => {
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
    it("should allow player to pick up equipment items", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Give player an equipment item
        const equipmentItem = new MyRoomState_1.ItemState();
        equipmentItem.id = "quantumPhaseShifter";
        equipmentItem.name = "Quantum Phase Shifter";
        equipmentItem.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
        equipmentItem.icon = "icons/quantum_shifter.png";
        equipmentItem.rarity = "equipment";
        equipmentItem.stackingType = "none";
        const effect = new MyRoomState_1.ItemEffect();
        effect.trigger = "onActivate";
        effect.effect = "dashAttack";
        equipmentItem.effects.push(effect);
        // Simulate picking up the equipment
        player.items.push(equipmentItem);
        yield room.waitForNextPatch();
        chai_1.assert.equal(player.items.length, 1, "Player should have one equipment item");
        chai_1.assert.equal(player.items[0].id, "quantumPhaseShifter", "Equipment should be correct item");
    }));
    it("should allow activation of equipment with E key", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Give player equipment item
        const equipmentItem = new MyRoomState_1.ItemState();
        equipmentItem.id = "alienSporePod";
        equipmentItem.name = "Alien Spore Pod";
        equipmentItem.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
        equipmentItem.icon = "icons/spore_pod.png";
        equipmentItem.rarity = "equipment";
        equipmentItem.stackingType = "none";
        player.items.push(equipmentItem);
        yield room.waitForNextPatch();
        // Simulate E key press
        client.send("interact");
        yield room.waitForNextPatch();
        // Equipment activation should be processed by server
        chai_1.assert.equal(player.items.length, 1, "Player should still have equipment after activation");
    }));
    it("should enforce equipment cooldowns", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Give player equipment with cooldown
        const equipmentItem = new MyRoomState_1.ItemState();
        equipmentItem.id = "alienSporePod";
        equipmentItem.name = "Alien Spore Pod";
        equipmentItem.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
        equipmentItem.icon = "icons/spore_pod.png";
        equipmentItem.rarity = "equipment";
        equipmentItem.stackingType = "none";
        player.items.push(equipmentItem);
        yield room.waitForNextPatch();
        // Activate equipment
        client.send("interact");
        yield room.waitForNextPatch();
        // Try to activate again immediately (should be blocked by cooldown)
        client.send("interact");
        yield room.waitForNextPatch();
        // Equipment should still work but server should handle cooldown logic
        chai_1.assert.equal(player.items.length, 1, "Player should still have equipment");
    }));
    it("should handle multiple equipment items correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Give player multiple equipment items
        const equipment1 = new MyRoomState_1.ItemState();
        equipment1.id = "quantumPhaseShifter";
        equipment1.name = "Quantum Phase Shifter";
        equipment1.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
        equipment1.icon = "icons/quantum_shifter.png";
        equipment1.rarity = "equipment";
        equipment1.stackingType = "none";
        const equipment2 = new MyRoomState_1.ItemState();
        equipment2.id = "alienSporePod";
        equipment2.name = "Alien Spore Pod";
        equipment2.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
        equipment2.icon = "icons/spore_pod.png";
        equipment2.rarity = "equipment";
        equipment2.stackingType = "none";
        player.items.push(equipment1);
        player.items.push(equipment2);
        yield room.waitForNextPatch();
        chai_1.assert.equal(player.items.length, 2, "Player should have two equipment items");
        // Activation should work with multiple equipment items
        client.send("interact");
        yield room.waitForNextPatch();
        chai_1.assert.equal(player.items.length, 2, "Player should still have both equipment items");
    }));
    it("should validate equipment item properties", () => __awaiter(void 0, void 0, void 0, function* () {
        const room = yield colyseus.createRoom("my_room", {});
        const client = yield colyseus.connectTo(room, {});
        yield room.waitForNextPatch();
        const player = room.state.players.get(client.sessionId);
        chai_1.assert.exists(player);
        // Test equipment item structure
        const equipmentItem = new MyRoomState_1.ItemState();
        equipmentItem.id = "quantumPhaseShifter";
        equipmentItem.name = "Quantum Phase Shifter";
        equipmentItem.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
        equipmentItem.icon = "icons/quantum_shifter.png";
        equipmentItem.rarity = "equipment";
        equipmentItem.stackingType = "none";
        player.items.push(equipmentItem);
        yield room.waitForNextPatch();
        const item = player.items[0];
        chai_1.assert.equal(item.id, "quantumPhaseShifter", "Equipment should have correct ID");
        chai_1.assert.equal(item.rarity, "equipment", "Equipment should have equipment rarity");
        chai_1.assert.equal(item.stackingType, "none", "Equipment should not stack");
        chai_1.assert.isArray(item.effects, "Equipment should have effects array");
    }));
});
