import { ColyseusTestServer, boot } from "@colyseus/testing";
import { assert } from "chai";
import appConfig from "./app.config";
import { MyRoomState, Projectile, Enemy } from "./rooms/schema/MyRoomState";
import { MyRoom } from "./rooms/MyRoom";

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

  it("should move enemies towards the player", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    player.x = 400;
    player.y = 300;

    // Manually create and position a waspDrone enemy for testing
    const enemy = new Enemy();
    enemy.id = "testWaspDrone";
    enemy.typeId = "waspDrone";
    enemy.x = 0;
    enemy.y = 0;
    room.state.enemies.set(enemy.id, enemy);

    await room.waitForNextPatch(); // Sync state with the new enemy

    const initialDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);

    await room.waitForNextPatch(); // Process one tick

    const newDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    assert.isBelow(newDistance, initialDistance);
  });

  it("should create a projectile when player attacks an enemy", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});

    // Manually create and position an enemy for testing
    const enemy = new Enemy();
    enemy.id = "testEnemy";
    enemy.typeId = "waspDrone";
    enemy.x = 110; // Very close to the player
    enemy.y = 100;
    room.state.enemies.set(enemy.id, enemy);

    await room.waitForNextPatch(); // Wait for state to sync

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    player.x = 100;
    player.y = 100;
    player.attackCooldown = 0; // Ensure player can attack immediately
    player.attackSpeed = 1; // 1 attack per second
    player.projectileSpeed = 100; // Explicitly set projectile speed
    player.damage = 10; // Explicitly set player damage

    // Advance time to allow attack cooldown to reset and attack to occur
    for (let i = 0; i < 100; i++) { // Simulate enough ticks for attack to occur
      await room.waitForNextPatch();
      if (room.state.projectiles.size > 0) break; // Break once projectile is created
    }

    assert.isAbove(room.state.projectiles.size, 0, "Projectile should be created");
  }).timeout(10000); // Explicitly set timeout to 10 seconds

  it("should move projectiles and remove them when they hit an enemy", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);
    player.x = 100;
    player.y = 100;
    player.attackCooldown = 0; // Ensure player can attack immediately
    player.attackSpeed = 1; // 1 attack per second

    // Manually create and position an enemy for testing
    const enemy = new Enemy();
    enemy.id = "testEnemy";
    enemy.typeId = "waspDrone";
    enemy.x = player.x + 200; // Away from the player for projectile travel
    enemy.y = player.y;
    enemy.maxHealth = 20;
    enemy.health = 20;
    enemy.damage = 5; // Enemy damage (not relevant for this test)
    enemy.moveSpeed = 1; // Enemy move speed (not relevant for this test)
    room.state.enemies.set(enemy.id, enemy);
    await room.waitForNextPatch(); // Sync state with the new enemy
    const initialEnemyHealth = enemy.health;

    // Advance time to allow player to fire a projectile
    for (let i = 0; i < 50; i++) { // Simulate enough ticks for attack to occur
      await room.waitForNextPatch();
      if (room.state.projectiles.size > 0) break; // Break once projectile is created
    }
    assert.isAbove(room.state.projectiles.size, 0, "Projectile should be created");

    const projectile = room.state.projectiles.values().next().value;
    assert.exists(projectile);

    // Advance time until projectile hits enemy
    for (let i = 0; i < 150; i++) { // Simulate enough ticks for collision
      await room.waitForNextPatch();
      if (room.state.projectiles.size === 0) break; // Projectile removed on hit
    }

    assert.equal(room.state.projectiles.size, 0, "Projectile should be removed after hitting enemy");
    assert.isBelow(enemy.health, initialEnemyHealth, "Enemy health should be reduced");
  }).timeout(15000); // Explicitly set timeout to 15 seconds

  it("should continuously spawn enemies up to the maximum limit", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {}); // Connect a player
    await room.waitForNextPatch();

    // Wait for the player to be added to the room state
    for (let i = 0; i < 10; i++) {
      await room.waitForNextPatch();
      if (room.state.players.has(client.sessionId)) break;
    }
    assert.isTrue(room.state.players.has(client.sessionId), "Player should be in the room state");

    // Clear initial enemy to test spawning from scratch
    room.state.enemies.clear();
    await room.waitForNextPatch();

    // Simulate enough time for 2 spawns to occur with SPAWN_INTERVAL of 500ms
    for (let i = 0; i < 150; i++) { // Simulate 150 ticks (approx 2.5 seconds)
      await room.waitForNextPatch();
    }

    assert.equal(room.state.enemies.size, 2, `Should spawn 2 enemies`);
  }).timeout(90000); // Increase timeout to 90 seconds

});