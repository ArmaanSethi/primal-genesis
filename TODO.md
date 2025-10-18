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

(No active bugs. All known issues resolved!)

---

## Phase 1: The Barebones Prototype (A Moving Player) - COMPLETE

---

## Phase 2: Implementing Core GDD Features

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

### 5. Asset Placeholders (In Progress)
- [ ] **Client:** Replace the placeholder `Rectangle` for the player with a `player.png` sprite.
- [ ] **Client:** Replace the placeholder `Rectangle` for the enemy with an `enemy.png` sprite.
