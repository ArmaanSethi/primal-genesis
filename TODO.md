# Project Primal Genesis - Task List

This plan is structured to get the most barebones, playable version of the game running as quickly as possible (Phase 1), before moving on to the more detailed features outlined in the GDD (Phase 2).

## Phase 1: The Barebones Prototype (A Moving Player)

The goal of this phase is to have a player connect to the server and move a character around an empty world.

### Backend (Server)
- [ ] **Project Setup:** Initialize Node.js project (`package.json`), install TypeScript and Colyseus.
- [ ] **Schema Definition:** Create a `src/rooms/schema/MyRoomState.ts`.
  - [ ] Define a `Player` schema with only `x` and `y` properties.
  - [ ] Define a `MyRoomState` schema containing a `MapSchema` of `Player`s.
- [ ] **Room Logic:** Create a `src/rooms/MyRoom.ts`.
  - [ ] Implement `onJoin` to create a `Player` and add it to the state.
  - [ ] Implement `onLeave` to remove the `Player`.
  - [ ] Implement a message handler `room.onMessage("input", ...)` that receives movement input.
  - [ ] In the input handler, directly update the player's `x` and `y` position in the state.
- [ ] **Server Entrypoint:** Create a `src/index.ts` to register the `MyRoom` and start the server.

### Frontend (Client)
- [ ] **Project Setup:** Initialize a Vite + TypeScript project, install Phaser and the Colyseus client SDK.
- [ ] **Scene Setup:** Create a `src/scenes/GameScene.ts`.
- [ ] **Server Connection:**
  - [ ] In `GameScene.ts`, connect to the Colyseus `MyRoom`.
- [ ] **State Synchronization:**
  - [ ] Create a local map to store player sprites.
  - [ ] Use `room.state.players.onAdd` to create a new Phaser `Rectangle` sprite for a new player and add it to the local map.
  - [ ] Use `player.onChange` to update the corresponding sprite's position based on server data.
  - [ ] Use `room.state.players.onRemove` to destroy the sprite.
- [ ] **Input Handling:**
  - [ ] In the scene's `update()` loop, create a state object for keyboard inputs (W, A, S, D).
  - [ ] Send the input state object to the server on every frame via `room.send("input", ...)`.

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

