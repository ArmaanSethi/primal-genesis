# Project Primal Genesis - Task List

## Developer Notes

- A `docs_context` directory exists in the project root. This folder is for providing me with documentation and context. It is ignored by `.gitignore` and its contents will not be committed to the repository.
- The documentation is organized into the following files:
  - `colyseus_server_api.md`: Covers the server-side room lifecycle.
  - `colyseus_client_api.md`: Covers the client-side room events.
  - `colyseus_schema.md`: Explains state synchronization and schema definition.
  - `phaser_core_concepts.md`: Covers the Phaser Scene lifecycle and basic Game Objects.
  - `phaser_gameplay_mechanics.md`: Covers Phaser physics, input, animations, cameras, and more.

## Development Log & Conventions

- **Colyseus Client Listeners:** After significant debugging, the correct and stable way to implement client-side state listeners is by using the `getStateCallbacks` utility from `colyseus.js`.
- **Phaser Scene Lifecycle:** Asynchronous operations, such as connecting to the Colyseus server, should be performed in the `create()` method, which can be safely marked `async`. The `init()` method is not compatible with `await` and should be used only for synchronous data initialization.
- **Test Runner Timeout:** Conf'd Mocha to have a 5-second timeout for tests to prevent hanging processes (`--timeout 5000` in `package.json`).

*Meta-Note: This document must be kept up-to-date. As tasks are completed, they should be marked with `[x]`. Unit tests should be added for all new functionality where possible. A 'Current Bugs' section will be maintained below, detailing active issues, diagnostic steps, and relevant logs.*

---

## Current Bugs

(No active bugs. All known issues resolved!)

---

## Phase 1: The Barebones Prototype (A Moving Player) - COMPLETE

---

## Phase 2: Implementing Core GDD Features - COMPLETE

### 1. Player Character Enhancement (Complete)
- [x] **Data:** Create `server/src/data/characters.json`.
- [x] **Schema:** Add GDD stats to the `Player` schema.
- [x] **Server Logic:** Initialize players with stats from data file.
- [x] **Unit Testing:** Verify players are created with correct base stats.

### 2. Enemies (Complete)
- [x] **Data:** Create `server/src/data/enemies.json`.
- [x] **Schema:** Create an `Enemy` schema and add to `RoomState`.
- [x] **Server Logic (Spawning):** Implement a basic system to spawn enemies.
- [x] **Unit Testing (Spawning):** Add tests for enemy schema and spawning.
- [x] **Client:** Render enemy sprites based on server state.
- [x] **Server Logic (AI):** Implement simple "seek player" AI in the game loop.
- [x] **Unit Testing (AI):** Add a test for the enemy AI logic.

### 3. World & Camera (Complete)
- [x] **Schema:** Add `worldWidth` and `worldHeight` to the `RoomState`.
- [x] **Server Logic:** Enforce world boundaries for all entities in the `update` loop.
- [x] **Client:** Add a visual representation of the world boundaries.
- [x] **Client:** Implement a camera that follows the player.
- [x] **Client:** Improve visual clarity of world boundaries (e.g., lighter background, distinct border).
- [x] **Server:** Increase world size to 3200x3200.
- [x] **Client:** Implement random background dots for visual context.
- [x] **Client:** Fix rendering order of background elements (dots are behind the background).

### 4. Combat (Complete)
- [x] **Server:** Implement player's automatic attack (targeting nearest enemy).
- [x] **Server:** Implement hit detection and damage application.
- [x] **Server:** Handle enemy death (remove from state).
- [x] **Unit Testing:** Add tests for automatic attack, hit detection, and damage.
- [x] **Client:** Add visual feedback for damage (e.g., enemy flash).
- [x] **Client:** Display health bars for enemies.
- [x] **Client:** Fix health bar centering for enemies.
- [x] **Client:** Standardize rendering depth for all game objects (players, enemies, health bars, projectiles).

### 5. Asset Placeholders (Complete)
- [x] **Client:** Replace the placeholder `Rectangle` for the player with a `player.png` sprite.
- [x] **Client:** Replace the placeholder `Rectangle` for the enemy with an `enemy.png` sprite.

---

## Phase 3: Combat Rework & Enemy Spawning - COMPLETE

### 1. Core Combat Loop (Complete)
- [x] **Schema:** Create a `Projectile` schema for tracking bullets.
- [x] **Server:** Implement automatic projectile firing from the player.
- [x] **Server:** Implement projectile movement and collision detection.
- [x] **Server:** Apply damage to enemies on projectile hit.
- [x] **Server:** Remove enemies when their health reaches zero.
- [x] **Client:** Render projectiles.
- [x] **Client:** Fix damage flash bug by using `Image` instead of `Rectangle`.

### 2. Enemy Spawning (Complete)
- [x] **Server:** Implement a timer to spawn enemies continuously.
- [x] **Server:** Increase the maximum number of enemies allowed.
- [x] **Server:** Adjust enemy movement speed (from previous bug fix).

### 3. Testing (Complete)
- [x] **Unit Testing:** Add tests for projectile creation and movement.
- [x] **Unit Testing:** Add tests for projectile-enemy collision and damage.
- [x] **Unit Testing:** Add tests for continuous enemy spawning.

---

## Phase 4: Player Health & Enemy Variety

### 1. Player Health & Damage
- [x] **Schema:** Add `health` and `maxHealth` to `Player` schema (already present, no changes needed).
- [x] **Server Logic:** Implement enemies dealing damage to players on collision (melee enemies).
    - **Details:** In `MyRoom.ts`, within the `update` loop, iterate through active enemies and players. For each enemy-player pair, check for collision using a circular collision model. If a collision occurs and the enemy's `attackCooldown` is ready, reduce the player's `health` by the enemy's `damage`. Apply a cooldown to the enemy's attack to prevent rapid damage.
- [x] **Server Logic:** Handle player death (e.g., remove player from game, respawn, end run).
    - **Details:** In `MyRoom.ts`, immediately after a player takes damage, check if `player.health` has dropped to 0 or below. If so, remove the player from `this.state.players`. (Future: Implement respawn or game over conditions).
- [x] **Client:** Display player's current health and max health (basic HUD element).
    - **Details:** In `GameScene.ts`, create a `Phaser.GameObjects.Text` object (`playerHealthText`) in the `onAdd` callback for the local player. Position it in a fixed location on the camera (using `setScrollFactor(0)`) and set its depth high (`setDepth(100)`). Update its text content (`Health: ${player.health}/${player.maxHealth}`) in the local player's `onChange` callback. Destroy the text object if the local player is removed.
- [x] **Client:** Visual feedback for player damage (e.g., screen tint, flash).
    - **Details:** In `GameScene.ts`, within the local player's `onChange` callback, compare the current `player.health` with a `previousHealth` value (stored on the player object). If health has decreased, apply a temporary red tint (`0xff0000`) to the player's sprite (`entity.setTint(0xff0000)`). Use `this.time.delayedCall(100, () => { entity.clearTint(); })` to remove the tint after 100ms. Update `player.previousHealth` after processing.
- [ ] **Unit Testing:** Add tests for player taking damage and health reduction.
    - **Details:** Create a new test file (e.g., `MyRoom.test.ts` or a new `PlayerCombat.test.ts`). Simulate a player and an enemy. Position them to collide. Advance the simulation and assert that the player's health decreases.
- [ ] **Unit Testing:** Add tests for player death.
    - **Details:** Extend the damage test. Simulate enough damage to reduce player health to 0 or below. Assert that the player is removed from `room.state.players`.

### 2. Enemy Variety (Spitter - Stationary Ranged)
- [x] **Data:** Add `spitter` enemy type to `enemies.json` with appropriate `baseStats`, `behavior: "stationary"`, and `attackType: "ranged"`.
    - **Details:** Added a new JSON entry for "spitter" in `server/src/data/enemies.json`. Defined `baseStats` (e.g., `maxHealth: 50`, `damage: 10`, `moveSpeed: 0`, `attackSpeed: 0.5`, `armor: 5`), `behavior: "stationary"`, `attackType: "ranged"`, and `projectileType: "spitterProjectile"`.
- [x] **Schema:** Update `Enemy` schema to include fields for ranged attack (e.g., `attackRange`, `projectileType`, `projectileSpeed`).
    - **Details:** Added `@type("number") attackRange: number = 0;` and `@type("string") projectileType: string = "";` to the `Enemy` class in `server/src/rooms/schema/MyRoomState.ts`.
- [x] **Server Logic (Spawning):** Update enemy spawning to randomly select between `waspDrone` and `spitter`.
    - **Details:** In `MyRoom.ts`, modified the enemy spawning logic within the `update` method to randomly pick between "waspDrone" and "spitter". Ensured the `Enemy` instance is initialized with the correct `baseStats` (including `attackRange` and `projectileType`) from the selected enemy type.
- [x] **Server Logic (AI):** Implement stationary behavior for `spitter`.
    - **Details:** In `MyRoom.ts`, within the enemy AI loop, added a check for `enemy.behavior`. If `enemy.behavior === "stationary"`, the enemy's position update logic is skipped.
- [x] **Server Logic (Attack):** Implement `spitter`'s ranged attack (lobbing projectile).
    - **Details:** For `spitter` enemies, if `enemy.attackCooldown` is ready and a player is within `enemy.attackRange`, a new `Projectile` instance is created. The projectile's properties (`ownerId`, `damage`, `speed`, `projectileType`, `rotation`, `x`, `y`) are set based on the `spitter`'s stats and target. The projectile is added to `this.state.projectiles`, and `enemy.attackCooldown` is reset.
- [x] **Client:** Render `spitter` enemy with a distinct sprite/color.
    - **Details:** In `GameScene.ts`, within the `enemies.onAdd` callback, added logic to check `enemy.typeId`. If it's "spitter", the enemy is rendered as a green rectangle (`0x00ff00`).
- [x] **Client:** Render `spitter`'s projectiles with a distinct sprite/color.
    - **Details:** In `GameScene.ts`, within the `projectiles.onAdd` callback, added logic to check `projectile.projectileType`. If it's "spitterProjectile", the projectile is rendered as a dark green rectangle (`0x008000`).
- [ ] **Unit Testing:** Add tests for `spitter` spawning and stationary behavior.
    - **Details:** Create a test that spawns a `spitter`. Assert that its `moveSpeed` is 0 and its position does not change over time.
- [ ] **Unit Testing:** Add tests for `spitter` ranged attack and projectile.
    - **Details:** Simulate a `spitter` and a player within its `attackRange`. Advance the simulation. Assert that a projectile is created with the correct properties and owner.

### 3. Enemy Variety (Charger - Melee with Charge Attack)
- [x] **Data:** Add `charger` enemy type to `enemies.json` with appropriate `baseStats`, `behavior: "charge"`, and `attackType: "melee"`.
    - **Details:** Added a new JSON entry for "charger" in `server/src/data/enemies.json`. Defined `baseStats` (e.g., `maxHealth: 70`, `damage: 15`, `moveSpeed: 5`, `attackSpeed: 0.7`, `armor: 10`), `behavior: "charge"`, `attackType: "melee"`. Added new properties like `chargeSpeed: 20` and `chargeDuration: 1000`.
- [x] **Schema:** Update `Enemy` schema to include fields for charge attack (e.g., `chargeCooldown`, `chargeSpeed`, `isCharging`, `chargeTargetX`, `chargeTargetY`).
    - **Details:** Added `@type("number") chargeCooldown: number = 0;`, `@type("number") chargeSpeed: number = 0;`, `@type("boolean") isCharging: boolean = false;`, `@type("number") chargeTargetX: number = 0;`, `@type("number") chargeTargetY: number = 0;` to the `Enemy` class in `server/src/rooms/schema/MyRoomState.ts`.
- [x] **Server Logic (Spawning):** Update enemy spawning to include `charger`.
    - **Details:** In `MyRoom.ts`, added "charger" to the array of randomly selected enemy `typeId`s. Ensured the `Enemy` instance is initialized with the correct `baseStats` for the charger.
- [x] **Server Logic (AI):** Implement `charger` behavior (telegraph, rush).
    - **Details:** For `charger` enemies, if `enemy.behavior === "charge"`:
        - If not `isCharging` and `chargeCooldown` is ready, the charger enters a telegraph phase, setting `chargeTargetX`, `chargeTargetY`, and a short `chargeCooldown`.
        - If `isCharging` and `chargeCooldown` is ready, the charger moves rapidly towards its `chargeTarget` using `chargeSpeed`.
        - Upon reaching the target, `isCharging` is reset, and a longer `chargeCooldown` is applied. `chargeCooldown` is decremented over time.
- [x] **Client:** Render `charger` enemy with a distinct sprite/color.
    - **Details:** In `GameScene.ts`, within the `enemies.onAdd` callback, added logic to check `enemy.typeId`. If it's "charger", the enemy is rendered as a purple rectangle (`0x800080`).
- [x] **Client:** Visual feedback for `charger`'s telegraph and charge.
    - **Details:** In `GameScene.ts`, within the `enemy.onChange` callback, if `enemy.typeId` is "charger" and `enemy.isCharging` is true, a yellow tint (`0xffff00`) is applied to the enemy sprite. The tint is cleared when `isCharging` is false.
- [ ] **Unit Testing:** Add tests for `charger` spawning and charge behavior.
    - **Details:** Create a test that spawns a `charger` and a player. Assert that the `charger` eventually enters a charging state and moves rapidly towards the player.

---

## Phase 5: Item System & World Interaction (Moved from Phase 4)

### 1. Item System
- [ ] **Data:** Define `Item` data structure in `items.json` (based on GDD examples).
    - **Details:** Create `server/src/data/items.json`. Populate it with example items like "Energy Drink" and "Unstable Tesla Coil" as described in `GDD.md` section "10.2. Data Structure Examples". Include `id`, `name`, `description`, `icon`, `rarity`, `stackingType`, and `effects`.
- [ ] **Schema:** Define `ItemState` schema in `MyRoomState.ts`.
    - **Details:** Create a new `ItemState` class extending `Schema` in `server/src/rooms/schema/MyRoomState.ts`. Include `@type` decorators for `id`, `name`, `description`, `icon`, `rarity`, `stackingType`, and any relevant effect properties.
- [ ] **Schema:** Add `items: ArraySchema<ItemState>` to `Player` schema.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type([ItemState]) items = new ArraySchema<ItemState>();` to the `Player` class.
- [ ] **Server Logic:** Implement item generation logic (e.g., what items can drop, rarity distribution).
    - **Details:** Create a helper function in `MyRoom.ts` (e.g., `generateRandomItem(rarity: string)`) that selects an item from `items.json` based on rarity and returns an `ItemState` instance.
- [ ] **Server Logic:** Implement item pickup logic (player collides with item, item added to player's `items` array).
    - **Details:** In `MyRoom.ts`, implement collision detection between players and `InteractableState` objects of type "item". When a player collides with an item, add the item's `ItemState` to the player's `items` `ArraySchema` and remove the `InteractableState` from the `RoomState`.
- [ ] **Server Logic:** Apply item effects to player stats (e.g., increase `attackSpeed`, `damage`).
    - **Details:** In `MyRoom.ts`, when an item is added to a player's `items` array, iterate through the item's `effects` and apply them to the player's `baseStats`. This might require a `calculatePlayerStats()` method that sums up all item effects.
- [ ] **Client:** Render item sprites in the world.
    - **Details:** In `GameScene.ts`, implement `room.state.interactables.onAdd` to render sprites for items (e.g., using `item.icon` or a placeholder).
- [ ] **Client:** Display item information on pickup (e.g., temporary HUD message).
    - **Details:** In `GameScene.ts`, when an item is picked up (detected by `player.items.onAdd`), display a temporary text message on the HUD showing the item's name and description.
- [ ] **Unit Testing:** Add tests for item generation, pickup, and stat application.
    - **Details:** Create tests to verify that `generateRandomItem` returns correct items. Simulate player-item collision and assert that the item is added to the player's inventory and player stats are updated.

### 2. Interactables (Chests, Tri-Shops, etc.)
- [ ] **Data:** Define `Interactable` data structure (e.g., `chests.json`, `trishops.json`).
    - **Details:** Create `server/src/data/interactables.json` (or separate files like `chests.json`, `trishops.json`). Define properties like `type`, `creditCost`, `dropChances` (for chests), `itemRarity` (for tri-shops).
- [ ] **Schema:** Define `InteractableState` schema in `MyRoomState.ts` (type, position, state).
    - **Details:** Create a new `InteractableState` class extending `Schema` in `server/src/rooms/schema/MyRoomState.ts`. Include `@type` decorators for `id`, `type`, `x`, `y`, and any specific state properties (e.g., `isOpen: boolean` for chests).
- [ ] **Schema:** Add `interactables: MapSchema<InteractableState>` to `RoomState`.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type({ map: InteractableState }) interactables = new MapSchema<InteractableState>();` to the `MyRoomState` class.
- [ ] **Server Logic (Director):** Implement procedural map population logic to spawn interactables based on GDD credit budget.
    - **Details:** In `MyRoom.ts`, create a `populateMap()` method called during `onCreate`. This method will use a credit budget (e.g., 500 credits for Stage 1 as per GDD) and randomly select interactables from `interactables.json` to spawn on the map until the budget is exhausted. Ensure interactables are placed at valid, non-overlapping positions.
- [ ] **Server Logic:** Implement player interaction logic (e.g., `room.onMessage("interact", ...)` to open chests, activate shops).
    - **Details:** In `MyRoom.ts`, implement an `onMessage("interact", ...)` handler. When a player sends an "interact" message, check if the player is within range of an interactable. Based on the interactable's type, trigger its effect (e.g., for a chest, generate a random item and add it to the player's inventory; for a Tri-Shop, generate 3 items and send them to the client for selection).
- [ ] **Client:** Render interactable sprites in the world.
    - **Details:** In `GameScene.ts`, implement `room.state.interactables.onAdd` to render sprites for items (e.g., using `item.icon` or a placeholder).
- [ ] **Client:** Visual feedback for interaction (e.g., opening chest animation, UI for Tri-Shop).
    - **Details:** In `GameScene.ts`, implement `interactables.onChange` to update the visual state of interactables (e.g., change chest sprite to "open"). For Tri-Shops, display a UI overlay with item choices.
- [ ] **Unit Testing:** Add tests for Director logic and player interaction.
    - **Details:** Create tests to verify that `populateMap()` correctly spawns interactables within the credit budget. Simulate player interaction messages and assert that the correct effects are triggered (e.g., item added to inventory, interactable removed).

### 3. Player HUD (Basic) (Moved from Phase 4)
- [x] **Client:** Display player's current health and max health. (Already completed in Phase 4.1)
- [ ] **Client:** Display player's current items.
    - **Details:** In `GameScene.ts`, create a UI element (e.g., a container or a list) to display the icons and names of items in the player's `items` `ArraySchema`. Update this UI element in `player.items.onAdd` and `player.items.onRemove`.

---

## Phase 6: Core Gameplay Loop & Difficulty Scaling (Moved and Renamed from Phase 4)

### 1. Leveling & XP
- [ ] **Schema:** Add `xp` and `level` to `Player` schema.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type("number") xp: number = 0;` and `@type("number") level: number = 1;` to the `Player` class.
- [ ] **Server Logic:** Enemies drop XP orbs on death.
    - **Details:** In `MyRoom.ts`, when an enemy dies, create a new `XPEntityState` (new schema needed) at the enemy's position and add it to `RoomState`.
- [ ] **Server Logic:** Player collects XP, levels up, and gains small stat increases.
    - **Details:** In `MyRoom.ts`, implement collision detection between players and `XPEntityState` objects. When a player collects XP, add the XP value to `player.xp`. If `player.xp` exceeds the `xpToNextLevel` threshold, increment `player.level`, reset `player.xp`, and apply stat increases (e.g., `player.maxHealth += 5`, `player.damage += 1`).
- [ ] **Client:** Render XP orbs.
    - **Details:** In `GameScene.ts`, implement `room.state.xpEntities.onAdd` to render small visual representations of XP orbs.
- [ ] **Client:** Visual feedback for leveling up.
    - **Details:** In `GameScene.ts`, when `player.level` changes, display a temporary "Level Up!" message or animation.
- [ ] **Unit Testing:** Add tests for XP gain and leveling.
    - **Details:** Simulate enemy death and XP orb creation. Simulate player collecting XP and assert that `player.xp` and `player.level` update correctly, and stats increase.

### 2. Time-Based Difficulty Scaling
- [ ] **Schema:** Add `difficultyLevel` to `RoomState`.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type("string") difficultyLevel: string = "Easy";` and `@type("number") timeElapsed: number = 0;` to `MyRoomState`.
- [ ] **Server Logic:** Implement difficulty meter that increases over time.
    - **Details:** In `MyRoom.ts`, within the `update` loop, increment `timeElapsed`. Every minute (or other defined interval), update `room.state.difficultyLevel` (Easy -> Medium -> Hard -> Very Hard -> INSANE) as per `GDD.md` section "6.1. Time-Based Difficulty Scaling".
- [ ] **Server Logic:** Adjust enemy spawn rates, health, damage based on difficulty.
    - **Details:** Modify enemy spawning logic and enemy stat initialization in `MyRoom.ts` to use `room.state.difficultyLevel` as a multiplier or lookup key for `SPAWN_INTERVAL`, `MAX_ENEMIES`, and enemy `baseStats`.
- [ ] **Unit Testing:** Add tests for difficulty scaling.
    - **Details:** Simulate game time passing. Assert that `room.state.difficultyLevel` changes correctly and that enemy stats/spawn rates are adjusted.

### 3. Bio-Resonance Beacon & Holdout Phase
- [ ] **Schema:** Add `beaconState` and `holdoutTimer` to `RoomState`.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type("string") beaconState: string = "inactive";` and `@type("number") holdoutTimer: number = 0;` to `MyRoomState`.
- [ ] **Server Logic:** Implement beacon activation, holdout timer, and increased enemy spawns.
    - **Details:** In `MyRoom.ts`, implement an `InteractableState` for the Beacon. When a player interacts with it, set `beaconState = "charging"`, start `holdoutTimer` (90 seconds as per GDD), and significantly increase enemy spawn rates and `MAX_ENEMIES`.
- [ ] **Client:** Render Beacon sprite.
    - **Details:** In `GameScene.ts`, render the Beacon `InteractableState` with a distinct sprite.
- [ ] **Client:** Display holdout timer and visual feedback.
    - **Details:** In `GameScene.ts`, display `room.state.holdoutTimer` on the HUD during the charging phase. Provide visual cues (e.g., flashing, pulsing) when `beaconState` is "charging".
- [ ] **Unit Testing:** Add tests for beacon logic.
    - **Details:** Simulate player interaction with the beacon. Assert that `beaconState` changes, `holdoutTimer` starts counting down, and enemy spawning parameters are modified.

### 4. Boss Fight
- [ ] **Schema:** Define `BossState` schema.
    - **Details:** Create a new `BossState` class extending `Schema` in `server/src/rooms/schema/MyRoomState.ts`. Include `@type` decorators for `id`, `typeId`, `x`, `y`, `health`, `maxHealth`, `damage`, `moveSpeed`, and any boss-specific properties (e.g., `attackPatternStage`).
- [ ] **Schema:** Add `boss: BossState` to `RoomState`.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type(BossState) boss: BossState;` to `MyRoomState`.
- [ ] **Server Logic:** Spawn boss after holdout phase.
    - **Details:** In `MyRoom.ts`, when `holdoutTimer` reaches 0 and `beaconState` is "charging", set `beaconState = "bossFight"`, create a `BossState` instance, and add it to `room.state.boss`.
- [ ] **Server Logic:** Implement boss AI and attack patterns.
    - **Details:** In `MyRoom.ts`, within the `update` loop, implement specific AI for the boss based on its `attackPatternStage`. This could involve movement, special attacks, or spawning minions.
- [ ] **Client:** Render boss sprite and health bar.
    - **Details:** In `GameScene.ts`, implement `room.state.boss.onChange` to render the boss sprite and a dedicated boss health bar on the HUD.
- [ ] **Unit Testing:** Add tests for boss spawning and basic AI.
    - **Details:** Simulate the end of the holdout phase. Assert that a boss is spawned. Test basic boss movement or attack initiation.

### 5. Exit Gates
- [ ] **Schema:** Define `ExitGateState` schema.
    - **Details:** Create a new `ExitGateState` class extending `Schema` in `server/src/rooms/schema/MyRoomState.ts`. Include `@type` decorators for `id`, `x`, `y`, `targetStageTheme`, `isOpen`.
- [ ] **Schema:** Add `exitGates: ArraySchema<ExitGateState>` to `RoomState`.
    - **Details:** In `server/src/rooms/schema/MyRoomState.ts`, add `@type([ExitGateState]) exitGates = new ArraySchema<ExitGateState>();` to `MyRoomState`.
- [ ] **Server Logic:** Spawn exit gates after boss defeat.
    - **Details:** In `MyRoom.ts`, when the boss's health reaches 0, set `beaconState = "stageComplete"`, and populate `room.state.exitGates` with 2-3 `ExitGateState` instances at random locations.
- [ ] **Server Logic:** Implement player interaction with exit gates.
    - **Details:** In `MyRoom.ts`, implement an `onMessage("enterExitGate", ...)` handler. When a player interacts with an open exit gate, transition the room to the next stage (requires new room logic or a reset mechanism).
- [ ] **Client:** Render exit gate sprites.
    - **Details:** In `GameScene.ts`, implement `room.state.exitGates.onAdd` to render distinct sprites for exit gates.
- [ ] **Unit Testing:** Add tests for exit gate logic.
    - **Details:** Simulate boss defeat. Assert that exit gates are spawned. Simulate player interaction and assert stage transition.

---

## Phase 7: Polish & Multiplayer Features (Moved and Renamed from Phase 5)

### 1. Multiplayer Rules
- [ ] **Server:** Implement loot distribution rules (first-come, first-served).
    - **Details:** Ensure that when an interactable is opened, only the first player to interact with it receives the loot, and the interactable is then removed or marked as used for all players.
- [ ] **Server:** Scale difficulty with player count.
    - **Details:** In `MyRoom.ts`, modify the `populateMap()` and enemy spawning logic to adjust `MAX_ENEMIES`, enemy `health`, and `damage` based on `this.state.players.size`.
- [ ] **Server:** Implement player revival mechanics.
    - **Details:** When a player dies, instead of immediately removing them, change their `player.state` to "ghost" and spawn a "revival circle" `InteractableState` at their death location. If another player stays within the circle for 10 seconds, revive the ghost player (set `player.state` back to "alive", restore health). If all players are ghosts, end the run.
- [ ] **Client:** Visual feedback for revival.
    - **Details:** In `GameScene.ts`, render ghost players differently (e.g., semi-transparent). Render the revival circle. Display a progress bar for revival.

### 2. Meta-Progression
- [ ] **Server:** Implement challenge tracking.
    - **Details:** Create a `ChallengeState` schema and a mechanism to track player progress against various challenges (e.g., "Kill 100 enemies", "Complete Stage 3").
- [ ] **Server:** Implement unlock system for new items/characters.
    - **Details:** When a challenge is completed, unlock new `Item` or `Character` data entries. Store unlocked items/characters in a persistent user profile (beyond the scope of a single room, might require a separate user service or local storage for single-player testing).
- [ ] **Client:** Display challenges and unlocks.
    - **Details:** Create UI elements to show active challenges and newly unlocked content.

### 3. UI/UX Enhancements
- [ ] **Client:** Main Menu and Lobby scenes.
    - **Details:** Create separate Phaser Scenes for a main menu (start game, options) and a lobby (player list, ready button, character selection).
- [ ] **Client:** Pause menu.
    - **Details:** Implement a pause menu that can be toggled during gameplay, allowing access to options or item review.
- [ ] **Client:** Visual effects (particles, screen shake).
    - **Details:** Add particle effects for hits, explosions, pickups. Implement screen shake on boss attacks or heavy damage.
- [ ] **Client:** Sound effects and music.
    - **Details:** Integrate audio assets for background music, enemy sounds, player actions, and UI feedback.

### 4. Client-Side Prediction & Interpolation
- [ ] **Client:** Implement client-side prediction for player movement.
    - **Details:** For the local player, immediately apply input movement on the client side for responsiveness. When a server update arrives, reconcile the client's predicted position with the server's authoritative position.
- [ ] **Client:** Implement interpolation for remote player/enemy movement.
    - **Details:** For remote players and enemies, instead of snapping to the new server position, smoothly interpolate their visual position between the last known server position and the new one over a short duration.
