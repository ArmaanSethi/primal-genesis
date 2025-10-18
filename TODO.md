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
- [ ] **Schema:** Add `health` and `maxHealth` to `Player` schema (if not already there, based on GDD it's there but `currentHealth` might be better).
- [ ] **Server Logic:** Implement enemies dealing damage to players on collision (melee enemies).
- [ ] **Server Logic:** Handle player death (e.g., remove player from game, respawn, end run).
- [ ] **Client:** Display player's current health and max health (basic HUD element).
- [ ] **Client:** Visual feedback for player damage (e.g., screen tint, flash).
- [ ] **Unit Testing:** Add tests for player taking damage and health reduction.
- [ ] **Unit Testing:** Add tests for player death.

### 2. Enemy Variety (Spitter - Stationary Ranged)
- [ ] **Data:** Add `spitter` enemy type to `enemies.json` with appropriate `baseStats`, `behavior: "stationary"`, and `attackType: "ranged"`.
- [ ] **Schema:** Update `Enemy` schema to include fields for ranged attack (e.g., `attackRange`, `projectileType`).
- [ ] **Server Logic (Spawning):** Update enemy spawning to randomly select between `waspDrone` and `spitter`.
- [ ] **Server Logic (AI):** Implement stationary behavior for `spitter`.
- [ ] **Server Logic (Attack):** Implement `spitter`'s ranged attack (lobbing projectile).
- [ ] **Client:** Render `spitter` enemy with a distinct sprite/color.
- [ ] **Client:** Render `spitter`'s projectiles with a distinct sprite/color.
- [ ] **Unit Testing:** Add tests for `spitter` spawning and stationary behavior.
- [ ] **Unit Testing:** Add tests for `spitter` ranged attack and projectile.

### 3. Enemy Variety (Charger - Melee with Charge Attack)
- [ ] **Data:** Add `charger` enemy type to `enemies.json` with appropriate `baseStats`, `behavior: "charge"`, and `attackType: "melee"`.
- [ ] **Schema:** Update `Enemy` schema to include fields for charge attack (e.g., `chargeCooldown`, `chargeSpeed`).
- [ ] **Server Logic (Spawning):** Update enemy spawning to include `charger`.
- [ ] **Server Logic (AI):** Implement `charger` behavior (telegraph, rush).
- [ ] **Client:** Render `charger` enemy with a distinct sprite/color.
- [ ] **Client:** Visual feedback for `charger`'s telegraph and charge.
- [ ] **Unit Testing:** Add tests for `charger` spawning and charge behavior.

---

## Phase 5: Item System & World Interaction (Moved from Phase 4)

### 1. Item System
- [ ] **Data:** Define `Item` data structure in `items.json` (based on GDD examples).
- [ ] **Schema:** Define `ItemState` schema in `MyRoomState.ts`.
- [ ] **Schema:** Add `items: ArraySchema<ItemState>` to `Player` schema.
- [ ] **Server Logic:** Implement item generation logic (e.g., what items can drop, rarity distribution).
- [ ] **Server Logic:** Implement item pickup logic (player collides with item, item added to player's `items` array).
- [ ] **Server Logic:** Apply item effects to player stats (e.g., increase `attackSpeed`, `damage`).
- [ ] **Client:** Render item sprites in the world.
- [ ] **Client:** Display item information on pickup (e.g., temporary HUD message).
- [ ] **Unit Testing:** Add tests for item generation, pickup, and stat application.

### 2. Interactables (Chests, Tri-Shops, etc.)
- [ ] **Data:** Define `Interactable` data structure (e.g., `chests.json`, `trishops.json`).
- [ ] **Schema:** Define `InteractableState` schema in `MyRoomState.ts` (type, position, state).
- [ ] **Schema:** Add `interactables: MapSchema<InteractableState>` to `RoomState`.
- [ ] **Server Logic (Director):** Implement procedural map population logic to spawn interactables based on GDD credit budget.
- [ ] **Server Logic:** Implement player interaction logic (e.g., `room.onMessage("interact", ...)` to open chests, activate shops).
- [ ] **Client:** Render interactable sprites in the world.
- [ ] **Client:** Visual feedback for interaction (e.g., opening chest animation, UI for Tri-Shop).
- [ ] **Unit Testing:** Add tests for Director logic and player interaction.

### 3. Player HUD (Basic) (Moved from Phase 4)
- [ ] **Client:** Display player's current health and max health.
- [ ] **Client:** Display player's current items.

---

## Phase 6: Core Gameplay Loop & Difficulty Scaling (Moved and Renamed from Phase 4)

### 1. Leveling & XP
- [ ] **Schema:** Add `xp` and `level` to `Player` schema.
- [ ] **Server Logic:** Enemies drop XP orbs on death.
- [ ] **Server Logic:** Player collects XP, levels up, and gains small stat increases.
- [ ] **Client:** Render XP orbs.
- [ ] **Client:** Visual feedback for leveling up.
- [ ] **Unit Testing:** Add tests for XP gain and leveling.

### 2. Time-Based Difficulty Scaling
- [ ] **Schema:** Add `difficultyLevel` to `RoomState`.
- [ ] **Server Logic:** Implement difficulty meter that increases over time.
- [ ] **Server Logic:** Adjust enemy spawn rates, health, damage based on difficulty.
- [ ] **Unit Testing:** Add tests for difficulty scaling.

### 3. Bio-Resonance Beacon & Holdout Phase
- [ ] **Schema:** Add `beaconState` and `holdoutTimer` to `RoomState`.
- [ ] **Server Logic:** Implement beacon activation, holdout timer, and increased enemy spawns.
- [ ] **Client:** Render Beacon sprite.
- [ ] **Client:** Display holdout timer and visual feedback.
- [ ] **Unit Testing:** Add tests for beacon logic.

### 4. Boss Fight
- [ ] **Schema:** Define `BossState` schema.
- [ ] **Schema:** Add `boss: BossState` to `RoomState`.
- [ ] **Server Logic:** Spawn boss after holdout phase.
- [ ] **Server Logic:** Implement boss AI and attack patterns.
- [ ] **Client:** Render boss sprite and health bar.
- [ ] **Unit Testing:** Add tests for boss spawning and basic AI.

### 5. Exit Gates
- [ ] **Schema:** Define `ExitGateState` schema.
- [ ] **Schema:** Add `exitGates: ArraySchema<ExitGateState>` to `RoomState`.
- [ ] **Server Logic:** Spawn exit gates after boss defeat.
- [ ] **Server Logic:** Implement player interaction with exit gates.
- [ ] **Client:** Render exit gate sprites.
- [ ] **Unit Testing:** Add tests for exit gate logic.

---

## Phase 7: Polish & Multiplayer Features (Moved and Renamed from Phase 5)

### 1. Multiplayer Rules
- [ ] **Server:** Implement loot distribution rules (first-come, first-served).
- [ ] **Server:** Scale difficulty with player count.
- [ ] **Server:** Implement player revival mechanics.
- [ ] **Client:** Visual feedback for revival.

### 2. Meta-Progression
- [ ] **Server:** Implement challenge tracking.
- [ ] **Server:** Implement unlock system for new items/characters.
- [ ] **Client:** Display challenges and unlocks.

### 3. UI/UX Enhancements
- [ ] **Client:** Main Menu and Lobby scenes.
- [ ] **Client:** Pause menu.
- [ ] **Client:** Visual effects (particles, screen shake).
- [ ] **Client:** Sound effects and music.

### 4. Client-Side Prediction & Interpolation
- [ ] **Client:** Implement client-side prediction for player movement.
- [ ] **Client:** Implement interpolation for remote player/enemy movement.