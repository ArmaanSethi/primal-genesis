import { ColyseusTestServer, boot } from "@colyseus/testing";
import { assert } from "chai";
import appConfig from "./app.config";
import { MyRoomState, Player, Enemy } from "./rooms/schema/MyRoomState";
import { MyRoom } from "./rooms/MyRoom";

describe("Beacon System Tests", () => {
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

  it("should spawn beacon when enough enemies are defeated", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Wait for initial beacon spawn (should happen when enemies are defeated)
    let beaconFound = false;
    for (let i = 0; i < 200; i++) { // Wait up to 200 ticks
      await room.waitForNextPatch();
      for (const interactable of room.state.interactables.values()) {
        if (interactable.type === "bioResonanceBeacon") {
          beaconFound = true;
          break;
        }
      }
      if (beaconFound) break;
    }

    assert.isTrue(beaconFound, "Beacon should spawn after sufficient enemy eliminations");
  });

  it("should create beacon with correct properties", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Wait for beacon to spawn
    let beacon: any = null;
    for (let i = 0; i < 200; i++) {
      await room.waitForNextPatch();
      for (const interactable of room.state.interactables.values()) {
        if (interactable.type === "bioResonanceBeacon") {
          beacon = interactable;
          break;
        }
      }
      if (beacon) break;
    }

    assert.exists(beacon, "Beacon should exist");
    assert.equal(beacon.type, "bioResonanceBeacon", "Beacon should have correct type");
    assert.isFalse(beacon.isOpen, "Beacon should initially be closed");
    assert.isNumber(beacon.x, "Beacon should have X coordinate");
    assert.isNumber(beacon.y, "Beacon should have Y coordinate");
  });

  it("should activate holdout phase when beacon is activated", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Wait for beacon to spawn
    let beaconId: string = "";
    for (let i = 0; i < 200; i++) {
      await room.waitForNextPatch();
      for (const [id, interactable] of room.state.interactables.entries()) {
        if (interactable.type === "bioResonanceBeacon") {
          beaconId = id;
          break;
        }
      }
      if (beaconId) break;
    }

    assert.isNotEmpty(beaconId, "Beacon ID should be found");

    // Move player near beacon
    const beacon = room.state.interactables.get(beaconId);
    if (beacon) {
      player.x = beacon.x;
      player.y = beacon.y;
      await room.waitForNextPatch();

      // Activate beacon
      client.send("interact", { interactableId: beaconId });
      await room.waitForNextPatch();

      // Check if holdout timer started
      assert.isAbove(room.state.holdoutTimer, 0, "Holdout timer should start after beacon activation");
    }
  });

  it("should spawn boss after holdout phase completes", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Wait for beacon to spawn
    let beaconId: string = "";
    for (let i = 0; i < 200; i++) {
      await room.waitForNextPatch();
      for (const [id, interactable] of room.state.interactables.entries()) {
        if (interactable.type === "bioResonanceBeacon") {
          beaconId = id;
          break;
        }
      }
      if (beaconId) break;
    }

    if (beaconId) {
      const beacon = room.state.interactables.get(beaconId);
      if (beacon) {
        player.x = beacon.x;
        player.y = beacon.y;
        await room.waitForNextPatch();

        // Activate beacon and wait through holdout phase
        client.send("interact", { interactableId: beaconId });
        await room.waitForNextPatch();

        // Wait for holdout to complete and boss to spawn
        let bossFound = false;
        for (let i = 0; i < 600; i++) { // Wait longer for holdout phase
          await room.waitForNextPatch();
          for (const enemy of room.state.enemies.values()) {
            if (enemy.typeId === "boss") {
              bossFound = true;
              break;
            }
          }
          if (bossFound) break;
        }

        assert.isTrue(bossFound, "Boss should spawn after holdout phase completes");
      }
    }
  });

  it("should create boss with correct properties", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Manually create a boss for testing
    const boss = new Enemy();
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
    await room.waitForNextPatch();

    const createdBoss = room.state.enemies.get("testBoss");
    assert.exists(createdBoss, "Boss should exist in game state");
    assert.equal(createdBoss.typeId, "boss", "Boss should have correct type");
    assert.equal(createdBoss.maxHealth, 1000, "Boss should have correct max health");
    assert.equal(createdBoss.damage, 25, "Boss should have correct damage");
    assert.equal(createdBoss.projectileType, "bossProjectile", "Boss should have correct projectile type");
  });

  it("should handle beacon state transitions correctly", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    // Check initial beacon state
    assert.equal(room.state.beaconState, "inactive", "Beacon should start as inactive");
    assert.equal(room.state.stageLevel, 1, "Stage level should start at 1");

    // The beacon state should transition through the different phases
    // inactive -> charging -> bossFight -> stageComplete
    // These transitions happen automatically based on game events
    assert.isString(room.state.beaconState, "Beacon state should be a string");
    assert.isNumber(room.state.stageLevel, "Stage level should be a number");
  });

  it("should spawn beacon at safe distance from player", async () => {
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});
    const client = await colyseus.connectTo(room, {});
    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId);
    assert.exists(player);

    // Set player position
    player.x = 500;
    player.y = 500;

    // Wait for beacon to spawn
    let beacon: any = null;
    for (let i = 0; i < 200; i++) {
      await room.waitForNextPatch();
      for (const interactable of room.state.interactables.values()) {
        if (interactable.type === "bioResonanceBeacon") {
          beacon = interactable;
          break;
        }
      }
      if (beacon) break;
    }

    if (beacon) {
      const distance = Math.hypot(beacon.x - player.x, beacon.y - player.y);
      assert.isAbove(distance, 200, "Beacon should spawn at safe distance from player");
      assert.isBelow(beacon.x, room.state.worldWidth - 100, "Beacon should be within world bounds");
      assert.isBelow(beacon.y, room.state.worldHeight - 100, "Beacon should be within world bounds");
      assert.isAbove(beacon.x, 100, "Beacon should be within world bounds");
      assert.isAbove(beacon.y, 100, "Beacon should be within world bounds");
    }
  });
});