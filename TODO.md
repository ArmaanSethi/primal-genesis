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
- **Test Runner Timeout:** Configured Mocha to have a 5-second timeout for tests to prevent hanging processes (`--timeout 5000` in `package.json`).

*Meta-Note: This document must be kept up-to-date. As tasks are completed, they should be marked with `[x]`. Unit tests should be added for all new functionality where possible. A 'Current Bugs' section will be maintained below, detailing active issues, diagnostic steps, and relevant logs.*

---

## Current Bugs

- [x] Charger enemies are not moving on the client during their charge behavior, despite server-side position updates. (Server-side NaN issue fixed. Client-side interpolation is a future task for smooth movement.)
- [x] Spitter enemies' ranged attack projectiles are not being rendered on the client with the correct `projectileType` and disappear too quickly to be seen. (Server-side timeToLive and speed adjusted.)

---

## Enemy Roster Overview

### WaspDrone (Blue Rectangle)
- **Description (GDD):** Basic melee enemy. Moves directly toward the player.
- **Expected Actions:** Moves directly towards the player. Deals melee damage upon contact.
- **Server-Side Functionality:**
    - Spawns correctly.
    - Moves towards the player (`seekPlayer` behavior).
    - Deals melee damage to players.
    - Health reduction and death are functional.
- **Client-Side Functionality:**
    - Renders as a blue rectangle.
    - Moves correctly on the client.
- **Current Bugs:** None.

### Spitter (Green Rectangle)
- **Description (GDD):** Stationary ranged enemy. Lobs a slow, arcing projectile.
- **Expected Actions:** Remains stationary. When a player is within its `attackRange`, it fires projectiles towards the player.
- **Server-Side Functionality:**
    - Spawns correctly.
    - Is stationary (as per GDD).
    - Creates projectiles when player is in range. Projectiles now have a `timeToLive` of 3 seconds.
    - Projectiles deal damage to players.
    - Health reduction and death are functional.
- **Client-Side Functionality:**
    - Renders as a green rectangle.
    - Is stationary (as expected).
    - Projectiles are rendered as larger dark green squares. Their `projectileType` is now correctly synchronized.
- **Current Bugs:**
    - [ ] Projectiles are not visible for a sufficient duration on the client (despite server-side `timeToLive`). This might be a client-side rendering issue or an immediate collision/out-of-bounds removal.

### Charger (Purple Rectangle)
- **Description (GDD):** Telegraphs its attack, then rushes forward at high speed.
- **Expected Actions:** First, it will enter a "telegraph" phase (visually indicated by changing color to yellow). After a short delay, it will "charge" (rush rapidly) towards the player's last known position. After the charge, it will have a cooldown before it can charge again. It deals melee damage if it collides with a player during its charge.
- **Server-Side Functionality:**
    - Spawns correctly.
    - Telegraphs its charge (sets `isCharging` and `chargeTarget`).
    - Updates `x` and `y` coordinates during the charge phase (server logs show `BEFORE` and `AFTER` move with changing coordinates).
    - Deals melee damage to players.
    - Health reduction and death are functional.
- **Client-Side Functionality:**
    - Renders as a purple rectangle.
    - Visual feedback for charging state (yellow `fillColor`) is functional.
    - **Does NOT visually move on the client during its charge.**
- **Current Bugs:**
    - [ ] Charger movement is not rendered on the client during its charge behavior, despite server-side position updates.

---

## Functional Right Now

- **Server-Side:**
    - Player connection and disconnection.
    - Player movement based on input.
    - Player stats initialized from `characters.json`.
    - Enemy spawning (WaspDrone, Spitter, Charger) with stats from `enemies.json`). **Spawning now respects minimum distance from player.**
    - WaspDrone (seekPlayer) movement.
    - Spitter (stationary) behavior (server-side, no movement).
    - Spitter ranged attack (creates projectiles).
    - Charger (charge) behavior (telegraph and rush).
    - Player automatic attack (fires projectiles).
    - Projectile movement and collision with enemies.
    - Enemy health reduction and death.
    - Enemy melee damage to players.
    - Player health reduction and death.
    - World boundaries enforcement.
    - All server-side unit tests are passing.

- **Client-Side:**
    - Connects to server and receives game state.
    - Renders world background and random dots.
    - Renders player as a red rectangle.
    - Renders enemies (WaspDrone, Spitter, Charger) as colored rectangles (blue for WaspDrone, green for Spitter, purple for Charger).
    - Renders player projectiles as light blue rectangles (now larger).
    - Renders spitter projectiles as dark green rectangles (now larger, but still disappearing quickly).
    - Camera follows local player.
    - Displays player health HUD.
    - Visual feedback for player damage (red `fillColor`).
    - Visual feedback for Charger's charging state (yellow `fillColor`).

---

## Next Steps: Debugging Enemy Behavior and Completing Unit Tests

### 1. Debug Enemy Client-Side Rendering
- [ ] **Client:** Debug Charger movement rendering.
    - **Details:** Re-examine `client/src/scenes/GameScene.ts` `enemy.onChange` listener. Confirm that `enemy.x` and `enemy.y` values for Chargers are actually changing within the client's `enemy` object. If they are, the issue is with Phaser's sprite update. If not, the issue is Colyseus synchronization (even with the re-assignment workaround).
- [ ] **Client:** Debug Spitter projectile visibility.
    - **Details:** Confirm if Spitter projectiles are now visible for a noticeable duration (around 3 seconds) before they disappear. If they are still vanishing instantly, investigate client-side rendering of these projectiles more closely (e.g., are they being destroyed prematurely on the client, or is there a visual bug?).

### 2. Complete Unit Tests for Enemy Behavior
- [x] **Unit Testing:** Add tests for player taking damage and health reduction. (Covered by existing server-side tests)
- [x] **Unit Testing:** Add tests for player death. (Covered by existing server-side tests)
- [x] **Unit Testing:** Add tests for `spitter` spawning and stationary behavior. (Covered by existing server-side tests)
- [ ] **Unit Testing:** Add tests for `spitter` ranged attack and projectile.
    - **Details:** Simulate a `spitter` and a player within its `attackRange`. Advance the simulation. Assert that a projectile is created with the correct properties and owner.
- [ ] **Unit Testing:** Add tests for `charger` spawning and charge behavior.
    - **Details:** Create a test that spawns a `charger` and a player. Assert that the `charger` eventually enters a charging state and moves rapidly towards the player.

---

## Phase 5: Item System & World Interaction

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
    - **Details:** In `MyRoom.ts`, within the `update` loop, increment `timeElapsed`. Every minute (or other defined interval), update `room.state.difficultyLevel` (Easy -> Medium -> Hard -> Very Hard -> INSANE) as per `GDD.md` section "6.1. Time-Based Difficulty Scaling`.
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
    - **Details:** When a player dies, instead of immediately removing them, change their `player.state` to "ghost" and spawn a "revival circle" `InteractableState` at their death location. If another player stays within the circle for 10 seconds, revive the ghost player (set `player.state` back to "alive", restore health).
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
    - **Details:** For remote players and enemies, instead of snapping to the new server position, smoothly interpolate their visual position between the last known server position and the new one over a short duration).