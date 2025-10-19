# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Primal Genesis is a 1-4 player cooperative 2D top-down action roguelite browser game built with Phaser 3 (frontend) and Colyseus (backend). The game features real-time multiplayer combat, automatic projectile attacks, and three enemy types with different behaviors.

## Development Commands

### Server (Node.js + Colyseus)
```bash
cd server
npm start                    # Start the development server
npm test                     # Run all unit tests (90s timeout)
```

### Client (Phaser + Vite)
```bash
cd client
npm run dev                  # Start development server with hot reload
npm run build                # Build for production (runs TypeScript + Vite build)
```

### Running the Full Application
1. Start the server first: `cd server && npm start`
2. Start the client: `cd client && npm run dev`
3. Open browser to `http://localhost:5173` (client dev server)

## Architecture Overview

### Multiplayer Architecture
- **Authoritative Server**: All game logic runs on the server-side in `MyRoom.ts`
- **Dumb Client**: Client only renders and sends input via Colyseus state synchronization
- **Fixed-Tick Game Loop**: Server runs at 20 TPS for deterministic game state
- **State Synchronization**: Uses Colyseus Schema system for automatic client-server sync

### Core Server Classes (`server/src/rooms/schema/MyRoomState.ts`)
- **Player**: Health, position, stats, input buffer
- **Enemy**: AI behavior, health, position, attack patterns (waspDrone, spitter, charger)
- **Projectile**: Movement, collision, owner tracking

### Enemy AI System
All enemy logic is server-authoritative with three implemented types:
- **WaspDrone**: Basic melee that seeks players (`seekPlayer` behavior)
- **Spitter**: Stationary ranged enemy that fires projectiles when players in range
- **Charger**: Telegraphs attack (yellow color), then charges rapidly at player position

### Data-Driven Design
- `server/src/data/characters.json`: Player stats and definitions
- `server/src/data/enemies.json`: Enemy types, stats, and behaviors
- New content should be added via JSON configuration rather than hardcoding

### Client-Side Rendering (`client/src/scenes/GameScene.ts`)
- Uses Colyseus `getStateCallbacks` utility for stable state change listeners
- Entities rendered as colored rectangles (red players, blue/green/purple enemies)
- WASD movement with client-side prediction
- Camera follows local player in 3200x3200 world

## Development Conventions

### Colyseus State Management
- Always use `getStateCallbacks` utility for client-side state listeners
- Server state changes should modify Schema properties directly
- Client should only send input messages, never modify game state

### Phaser Scene Lifecycle
- Use `create()` method for async operations like server connection
- Use `init()` for synchronous data initialization only
- Input handling should be set up in `create()` method

### Testing Configuration
- Mocha configured with 90-second timeout for complex tests
- Server tests cover all game logic; no client testing framework currently used
- Tests are located in `server/src/**/*.test.ts` files

### Current Known Issues
- Charger movement not properly synchronized on client during charge behavior
- Spitter projectiles may have visibility issues due to client-side rendering timing

## Key File Locations
- Server game loop: `server/src/rooms/MyRoom.ts` (update method)
- State schemas: `server/src/rooms/schema/MyRoomState.ts`
- Client rendering: `client/src/scenes/GameScene.ts`
- Data definitions: `server/src/data/` directory
- Development docs: `docs_context/` directory (not git tracked)