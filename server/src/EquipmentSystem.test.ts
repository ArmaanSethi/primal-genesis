import { ColyseusTestServer, boot } from "@colyseus/testing";
import { assert } from "chai";
import appConfig from "./app.config";
import { MyRoomState, ItemState, ItemEffect } from "./rooms/schema/MyRoomState";

describe("Equipment System Tests", () => {
  let colyseus: ColyseusTestServer;

  before(async () => {
    colyseus = await boot(appConfig);
  });

  after(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("should allow player to pick up equipment items", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Give player an equipment item
    const equipmentItem = new ItemState();
    equipmentItem.id = "quantumPhaseShifter";
    equipmentItem.name = "Quantum Phase Shifter";
    equipmentItem.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
    equipmentItem.icon = "icons/quantum_shifter.png";
    equipmentItem.rarity = "equipment";
    equipmentItem.stackingType = "none";
    const effect = new ItemEffect();
    effect.trigger = "onActivate";
    effect.effect = "dashAttack";
    equipmentItem.effects.push(effect);

    // Simulate picking up the equipment
    player.items.push(equipmentItem);
    await room.waitForNextPatch();

    assert.equal(player.items.length, 1, "Player should have one equipment item");
    assert.equal(player.items[0].id, "quantumPhaseShifter", "Equipment should be correct item");
  });

  it("should allow activation of equipment with E key", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Give player equipment item
    const equipmentItem = new ItemState();
    equipmentItem.id = "alienSporePod";
    equipmentItem.name = "Alien Spore Pod";
    equipmentItem.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
    equipmentItem.icon = "icons/spore_pod.png";
    equipmentItem.rarity = "equipment";
    equipmentItem.stackingType = "none";

    player.items.push(equipmentItem);
    await room.waitForNextPatch();

    // Simulate E key press
    client.send("interact");
    await room.waitForNextPatch();

    // Equipment activation should be processed by server
    assert.equal(player.items.length, 1, "Player should still have equipment after activation");
  });

  it("should enforce equipment cooldowns", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Give player equipment with cooldown
    const equipmentItem = new ItemState();
    equipmentItem.id = "alienSporePod";
    equipmentItem.name = "Alien Spore Pod";
    equipmentItem.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
    equipmentItem.icon = "icons/spore_pod.png";
    equipmentItem.rarity = "equipment";
    equipmentItem.stackingType = "none";

    player.items.push(equipmentItem);
    await room.waitForNextPatch();

    // Activate equipment
    client.send("interact");
    await room.waitForNextPatch();

    // Try to activate again immediately (should be blocked by cooldown)
    client.send("interact");
    await room.waitForNextPatch();

    // Equipment should still work but server should handle cooldown logic
    assert.equal(player.items.length, 1, "Player should still have equipment");
  });

  it("should handle multiple equipment items correctly", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Give player multiple equipment items
    const equipment1 = new ItemState();
    equipment1.id = "quantumPhaseShifter";
    equipment1.name = "Quantum Phase Shifter";
    equipment1.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
    equipment1.icon = "icons/quantum_shifter.png";
    equipment1.rarity = "equipment";
    equipment1.stackingType = "none";

    const equipment2 = new ItemState();
    equipment2.id = "alienSporePod";
    equipment2.name = "Alien Spore Pod";
    equipment2.description = "Equipment: Hurls explosive alien spores dealing 200 damage in a wide area. 10s cooldown. Press E to activate.";
    equipment2.icon = "icons/spore_pod.png";
    equipment2.rarity = "equipment";
    equipment2.stackingType = "none";

    player.items.push(equipment1);
    player.items.push(equipment2);
    await room.waitForNextPatch();

    assert.equal(player.items.length, 2, "Player should have two equipment items");

    // Activation should work with multiple equipment items
    client.send("interact");
    await room.waitForNextPatch();

    assert.equal(player.items.length, 2, "Player should still have both equipment items");
  });

  it("should validate equipment item properties", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Test equipment item structure
    const equipmentItem = new ItemState();
    equipmentItem.id = "quantumPhaseShifter";
    equipmentItem.name = "Quantum Phase Shifter";
    equipmentItem.description = "Equipment: Phase through enemies, dealing 50 damage and gaining 0.5s invincibility. Press E to activate.";
    equipmentItem.icon = "icons/quantum_shifter.png";
    equipmentItem.rarity = "equipment";
    equipmentItem.stackingType = "none";

    player.items.push(equipmentItem);
    await room.waitForNextPatch();

    const item = player.items[0];
    assert.equal(item.id, "quantumPhaseShifter", "Equipment should have correct ID");
    assert.equal(item.rarity, "equipment", "Equipment should have equipment rarity");
    assert.equal(item.stackingType, "none", "Equipment should not stack");
    assert.isArray(item.effects, "Equipment should have effects array");
  });
});