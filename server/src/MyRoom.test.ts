import { ColyseusTestServer, boot } from "@colyseus/testing";
import { assert } from "chai";
import appConfig from "./app.config";
import { MyRoomState } from "./rooms/schema/MyRoomState";

describe("MyRoom Integration Tests", () => {
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

  it("should add a player on join", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch(); // Wait for state to sync
    assert.isTrue(room.state.players.has(client.sessionId));
    assert.equal(room.state.players.size, 1);
  });

  it("should remove a player on leave", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();
    assert.equal(room.state.players.size, 1);

    await client.leave();

    // Wait a short moment for the server to process the leave event
    await new Promise(resolve => setTimeout(resolve, 50));

    assert.equal(room.state.players.size, 0);
  });

  it("should initialize player with correct base stats", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    assert.equal(player.maxHealth, 100);
    assert.equal(player.damage, 12);
  });

  it("should update player position on input", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    const initialX = player.x;
    const initialY = player.y;

    client.send("input", { x: 1, y: -1 });

    // Wait for the next server tick
    await room.waitForNextPatch();

    assert.isAbove(player.x, initialX);
    assert.isBelow(player.y, initialY);
  });

  it("should spawn an enemy on create", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    await room.waitForNextPatch();
    assert.equal(room.state.enemies.size, 1);
    const enemy = room.state.enemies.values().next().value;
    assert.exists(enemy);
    assert.equal(enemy.typeId, "waspDrone");
    assert.isString(enemy.id); // Assert that id is a string
    assert.isNotEmpty(enemy.id); // Assert that id is not empty
  });

  it("should move enemies towards the player", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    player.x = 400;
    player.y = 300;

    const enemy = room.state.enemies.values().next().value;
    assert.exists(enemy);
    enemy.x = 0;
    enemy.y = 0;

    const initialDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);

    await room.waitForNextPatch(); // Process one tick

    const newDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    assert.isBelow(newDistance, initialDistance);
  });

  it("should player automatically attack nearest enemy", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    player.x = 100;
    player.y = 100;

    const enemy = room.state.enemies.values().next().value;
    assert.exists(enemy);
    enemy.x = 100;
    enemy.y = 100;
    const initialEnemyHealth = enemy.health;

    // Advance time to allow attack cooldown to reset and attack to occur
    for (let i = 0; i < 10; i++) { // Simulate a few ticks
      await room.waitForNextPatch();
    }

    assert.isBelow(enemy.health, initialEnemyHealth);
  });

});