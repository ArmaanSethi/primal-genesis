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

- **Colyseus Client Listeners:** After significant debugging, the correct and stable way to implement client-side state listeners is by using the `getStateCallbacks` utility from `colyseus.js`. Direct assignment (`.onChange = ...`) or direct calls (`.onChange(...)`) have proven unreliable.
- **Phaser Scene Lifecycle:** Asynchronous operations, such as connecting to the Colyseus server, should be performed in the `create()` method, which can be safely marked `async`. The `init()` method is not compatible with `await` and should be used only for synchronous data initialization.
- **Bug Tracking:** This `TODO.md` file will maintain a `Current Bugs` section to track active issues, their diagnostic steps, and relevant logs.
- **Commits:** Major milestones or the completion of significant features should be committed to Git with a detailed and descriptive message.

*Meta-Note: This document must be kept up-to-date. As tasks are completed, they should be marked with `[x]`. Unit tests should be added for all new functionality where possible. A 'Current Bugs' section will be maintained below, detailing active issues, diagnostic steps, and relevant logs.*

This plan is structured to get the most barebones, playable version of the game running as quickly as possible (Phase 1), before moving on to the more detailed features outlined in the GDD (Phase 2).

## Current Bugs

(No active bugs. Phase 1 is complete!)

## Next Steps

Phase 1 is complete. The next session will begin work on **Phase 2: Implementing Core GDD Features**, starting with adding enemies to the game.

## Phase 1: The Barebones Prototype (A Moving Player)

The goal of this phase is to have a player connect to the server and move a character around an empty world.

### Backend (Server)
- [x] **Project Setup:** Initialize Node.js project (`package.json`), install TypeScript and Colyseus.
- [x] **Schema Definition:** Create a `src/rooms/schema/MyRoomState.ts`.
  - [x] Define a `Player` schema with only `x` and `y` properties.
  - [x] Define a `MyRoomState` schema containing a `MapSchema` of `Player`s.
- [x] **Room Logic:** Create a `src/rooms/MyRoom.ts`.
  - [x] Implement `onJoin` to create a `Player` and add it to the state.
  - [x] Implement `onLeave` to remove the `Player`.
  - [x] Implement a message handler `room.onMessage("input", ...)` that receives movement input.
  - [x] In the input handler, directly update the player's `x` and `y` position in the state.
- [x] **Server Entrypoint:** Create a `src/index.ts` to register the `MyRoom` and start the server.

- [x] **Unit Testing:**
  - [x] Set up Mocha and Chai for server-side testing.
  - [x] Write a test for `onJoin` to ensure a player is added to the state.
  - [x] Write a test for `onLeave` to ensure a player is removed from the state.
  - [x] Write a test for the "input" message handler to ensure player position is updated.

### Frontend (Client)
- [x] **Project Setup:** Initialize a Vite + TypeScript project, install Phaser and the Colyseus client SDK.
- [x] **Scene Setup:** Create a `src/scenes/GameScene.ts`.
- [x] **Server Connection:**
  - [x] In `GameScene.ts`, connect to the Colyseus `MyRoom`.
- [x] **State Synchronization:**
  - [x] Create a local map to store player sprites.
  - [x] Use `room.state.players.onAdd` to create a new Phaser `Rectangle` sprite for a new player and add it to the local map.
  - [x] Use `player.onChange` to update the corresponding sprite's position based on server data.
  - [x] Use `room.state.players.onRemove` to destroy the sprite.
- [x] **Input Handling:**
  - [x] In the scene's `update()` loop, create a state object for keyboard inputs (W, A, S, D).
  - [x] Send the input state object to the server on every frame via `room.send("input", ...)`.

---

## Phase 2: Implementing Core GDD Features

Once the barebones prototype is working, these tasks will add the core gameplay mechanics.

### Core Gameplay
- [ ] **Enemies:**
  - [ ] **Server:** Create an `Enemy` schema and add a `MapSchema` of enemies to the `RoomState`.
  - [ ] **Server:** Implement a basic system to spawn a few enemies.
  - [ ] **Server:** Implement simple "seek player" AI in the game loop.
  - [ ] **Client:** Render enemy sprites based on server state.
- [ ] **Combat:**
  - [ ] **Server:** Implement an automatic attack for the player that targets the nearest enemy.
  - [ ] **Server:** Add `health` to `Player` and `Enemy` schemas.
  - [ ] **Server:** Implement hit detection and apply damage.
  - [ ] **Client:** Display health bars or other visual feedback for damage.
- [ ] **Player Character:**
  - [ ] **Data:** Create `characters.json` to define base stats.
  - [ ] **Server:** Add GDD stats (`maxHealth`, `damage`, `moveSpeed`, etc.) to the `Player` schema.
  - [ ] **Client:** Replace the `Rectangle` with a placeholder `player.png` sprite.

### Game Loop Objective
- [ ] **Interactables:**
  - [ ] **Server:** Create a `BioResonanceBeacon` schema/entity.
  - [ ] **Server:** Spawn one Beacon on the map at the start.
  - [ ] **Client:** Render the Beacon sprite.
- [ ] **Holdout & Boss:**
  - [ ] **Server:** Implement interaction logic for the Beacon.
  - [ ] **Server:** When activated, start a 90-second timer and increase enemy spawn rates.
  - [ ] **Server:** After the timer, spawn a "Boss" enemy (a larger, stronger version of a normal enemy).
- [ ] **Items (Simplified):**
  - [ ] **Data:** Create `items.json` with 1-2 simple items (e.g., `EnergyDrink` for attack speed).
  - [ ] **Server:** Create a `Chest` interactable that gives a random item when a player interacts with it.
  - [ ] **Server:** Apply item stat bonuses to the player's schema.
  - [ ] **Client:** Render chests and show some UI feedback when an item is collected.

