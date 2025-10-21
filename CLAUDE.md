# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Primal Genesis is a 1-4 player cooperative 2D top-down action roguelite browser game built with Phaser 3 (frontend) and Colyseus (backend). The game features real-time multiplayer combat, automatic projectile attacks, 6 enemy types with elite variants, 34 unique items, and comprehensive status effects systems.

## Development Commands

### Server (Node.js + Colyseus)
```bash
cd server
npm start                    # Start the development server
npm run dev                  # Start with nodemon for auto-restart
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
- **Player**: Health, position, stats, input buffer, inventory with 34 items
- **Enemy**: AI behavior, health, position, status effects (poison, fire, chill, vulnerability)
- **Projectile**: Movement, collision, owner tracking
- **Interactable**: Chests, barrels, tri-shops with item rewards
- **XPEntity**: Experience orbs for player progression

### Enemy AI System
All enemy logic is server-authoritative with 6 base types + 6 elite variants:
- **WaspDrone**: Basic melee that seeks players (`seekPlayer` behavior)
- **Spitter**: Stationary ranged enemy that fires projectiles when players in range
- **Charger**: Telegraphs attack, then charges rapidly at player position
- **Exploder**: Rushes toward player and explodes on contact
- **Swarm**: Fast enemies with group damage bonus
- **Shield**: Tanky enemies with health regeneration
- **Elite Variants**: Enhanced versions with 2-3x stats and unique colors

### Item System (34 Total Items)
- **17 Original Items**: Basic stat boosts and simple effects
- **17 New Advanced Items**: Poison glands, fire orbs, chain lightning, life steal, AoE damage
- **4 Rarity Tiers**: Common, Uncommon, Rare, Equipment
- **Equipment Items**: Activatable abilities (dash, grenade)
- **Status Effect Items**: Apply poison, burn, chill, vulnerability on hit

### Status Effects System
- **Poison**: Damage over time with stacking (max 10 stacks)
- **Burn**: Fire damage over time
- **Chill**: Movement speed reduction
- **Vulnerability**: Increased damage taken

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

## Key File Locations
- Server game loop: `server/src/rooms/MyRoom.ts` (update method)
- State schemas: `server/src/rooms/schema/MyRoomState.ts`
- Client rendering: `client/src/scenes/GameScene.ts`
- Data definitions: `server/src/data/` directory
- Development docs: `docs_context/` directory (not git tracked)
- **Project status & tasks**: `TODO.md` (comprehensive project overview and task list)

## Project Status

For complete project status, task lists, progress tracking, and game information, **see TODO.md** which contains:
- Current progress overview and completion estimates
- Fully implemented systems and recent accomplishments
- Current issues and next development priorities
- Project statistics and metrics
- How to play the current build
- Visual guide to game entities

## Commit Guidelines

### 🚨 CRITICAL: NO AI ATTRIBUTION IN COMMITS

**ABSOLUTELY NEVER ADD AI ATTRIBUTION**
- ❌ NO "Written by Claude"
- ❌ NO "Generated by Claude"
- ❌ NO "Assisted by AI"
- ❌ NO "Created with Claude Code"
- ❌ NO AI model references whatsoever

**COMMIT MESSAGES SHOULD BE:**
- ✅ Professional and focused on the work itself
- ✅ Clear, descriptive, and following conventional commit format
- ✅ About the code changes, not the tools used to make them

### Proper Commit Message Examples
```
feat: add elite enemy variants with enhanced stats
fix: resolve item pickup system for all interactable types
perf: optimize collision detection with spatial grid
refactor: improve status effects processing
docs: update API documentation
test: add unit tests for item system
```

### Commit Categories
- `feat:` New features or functionality
- `fix:` Bug fixes and corrections
- `perf:` Performance optimizations
- `refactor:` Code refactoring without functional changes
- `docs:` Documentation updates
- `test:` Test-related changes
- `style:` Code style and formatting changes

### REMEMBER
The commit history represents the project's development journey, not the tools used. Keep it professional and focused on the actual changes made to the codebase.