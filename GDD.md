# Game Design Document: Project Primal Genesis

## 1. Game Overview

### 1.1. High-Concept Pitch
Project Primal Genesis is a 1-4 player co-op, 2D top-down action roguelite for the browser. Players embody Bio-Researchers, combining hundreds of synergistic items to become overwhelmingly powerful. They must survive the ever-increasing ferocity of a hostile alien jungle, defeat massive guardians, and find a path to escape. It's the automatic combat and enemy density of *Vampire Survivors* fused with the real-time item scaling, world structure, and time-based difficulty of *Risk of Rain 2*.

### 1.2. Core Pillars
* **Constant Action, Zero Pauses:** Gameplay is never interrupted. Items are picked up in real-time. Player skill is expressed through movement, positioning, and target prioritization.
* **Exponential Power Growth:** Players start weak but rapidly scale into screen-clearing powerhouses through a deep and synergistic item system. The fun is in discovering broken item combinations.
* **Escalating Threat:** A relentless, time-based difficulty system ensures that no run is ever safe. The world scales alongside the player, creating a thrilling race against the clock.
* **Explore and Loot:** Large, open maps are populated with interactables using a credit-based system, ensuring run variety. The primary way to gain power is to explore quickly and efficiently.

### 1.3. Theme & Setting
* **Aesthetics:** A vibrant, alien jungle planet. Lush flora, strange geological formations, and bio-luminescent creatures. Art style is 2D, vibrant, and clear, prioritizing readability of enemy attacks and player effects.
* **Player Characters:** Anthropomorphic animal Bio-Researchers (e.g., a nimble lemur, a sturdy rhino, a versatile chameleon) equipped with scientific gadgets that function as their weapons.
* **Enemies:** Alien fauna and flora. Aggressive insectoids, charging beasts, and stationary turrets that have evolved to defend the planet.

## 2. Core Gameplay Loop

1.  **Start Run:** Players select their Researcher and load into Stage 1, a large, procedurally arranged 2D map.
2.  **Explore & Power Up:** The map is populated with a random assortment of **Chests**, **Tri-Shops**, and other interactables. Players run around the map opening them to acquire passive **Items** and one active **Equipment**. No currency is needed for basic chests.
3.  **Survive & Scale:** As players kill enemies, they gain experience and level up, which provides small, automatic increases to base stats. The main power boost comes from items.
4.  **Find the Objective:** Players must locate the **Bio-Resonance Beacon** on the map.
5.  **Activate & Defend:** Activating the Beacon begins a 90-second charge sequence. During this "Holdout Phase," enemy spawn rates are massively increased.
6.  **Boss Fight:** Once the Beacon is fully charged, the Stage Guardian (Boss) spawns.
7.  **Choose Your Path:** Upon defeating the Guardian, 2-3 **Exit Gates** appear. Each Gate displays an icon indicating the theme of the next stage. Players vote or the host chooses a gate to travel through.
8.  **Repeat:** The loop repeats on a new, more difficult stage.
9.  **End Run:** The run ends when all players are defeated or after they defeat the final boss.

## 3. Player Character

### 3.1. Controls
* **Movement:** WASD keys.
* **Dash:** Spacebar. A short-range, quick dash that provides 0.2 seconds of invincibility. 6-second cooldown.
* **Activate Equipment:** Right Mouse Button or 'E' key.

### 3.2. Base Stats
* `maxHealth`: Player's total health pool.
* `healthRegen`: Health regenerated per second.
* `damage`: Base damage for all outgoing attacks.
* `attackSpeed`: Base rate of fire for automatic weapons.
* `moveSpeed`: Player movement speed.
* `armor`: Flat damage reduction.
* `critChance`: Percentage chance to deal critical damage (200% base damage).

### 3.3. Core Mechanics
* **Automatic Attack:** Each character has a unique primary weapon that fires automatically at a set interval, targeting the nearest enemy within range.
* **Leveling Up:** Killing enemies drops XP orbs. Gaining a level provides a small increase to `maxHealth` and `damage` for the current run.
* **Equipment:** Players can hold one piece of Equipment at a time. Picking up a new one replaces the old one.

## 4. The Item System

### 4.1. Philosophy
Items are the heart of the game. They should be simple to understand individually but have complex and powerful emergent synergies.

### 4.2. Item Rarity Tiers
Items are categorized by rarity, which determines their power and drop rate.
* **Common (White):** Simple stat boosts. The backbone of any build.
* **Uncommon (Green):** More complex effects or stronger stat boosts. Often build-defining.
* **Rare (Red):** Powerful, unique effects that can dramatically alter gameplay.
* **Equipment (Orange):** Activated abilities.

### 4.3. Stacking & Logic
* **Linear:** Bonus stacks additively (e.g., `+10% Attack Speed` per stack).
* **Diminishing Returns:** Bonus effectiveness is reduced with each stack (e.g., `+10 Armor` for the first, `+8` for the second).
* **Special:** Stacks modify the item's effect in a unique way (e.g., `Chain Lightning`: First stack hits 2 targets, each additional stack adds +1 target).

## 5. The World & Stage Design

### 5.1. The Director: Procedural Map Population
Each stage uses a server-side system called the **Director** to ensure run variety.
1.  Each map has a budget of "credits". For example, Stage 1 has 500 credits.
2.  The Director "spends" these credits by randomly selecting interactables from a weighted table and placing them in valid spawn locations on the map until it runs out of credits.
3.  This system ensures that every run feels different, with a varying density of loot and types of interactables.

### 5.2. Interactable Types & Costs

| Interactable        | Credit Cost | Description                                                                                             |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| Small Chest         | 10          | Contains one item. Drop chances: 80% Common, 19% Uncommon, 1% Rare.                                     |
| Large Chest         | 25          | Contains one item. Drop chances: 0% Common, 80% Uncommon, 20% Rare.                                      |
| Tri-Shop            | 20          | Presents a choice of 3 items of the same rarity tier (e.g., 3 Commons). Taking one consumes the shop.     |
| Equipment Barrel    | 15          | Contains one random Equipment (Orange) item.                                                            |
| Whispering Totem    | 5           | Costs 50% of the player's max health to activate for one random item. 10% chance to fail and do nothing. |
| Altar of the Apex   | 0           | Found near the Beacon. Activating it empowers the boss (+50% HP, +25% Damage) to guarantee a Rare (Red) item drop. |

### 5.3. The Objective & Boss Fight
The **Bio-Resonance Beacon** is the main objective. Activating it starts the 90-second holdout phase, culminating in the boss fight. The boss is a large, unique enemy with a specific attack pattern that players must learn.

## 6. Enemies & Difficulty

### 6.1. Time-Based Difficulty Scaling
The game uses a time-based difficulty system.
* A difficulty meter on the HUD increases every minute, cycling through levels: Easy -> Medium -> Hard -> Very Hard -> INSANE.
* Higher difficulty increases enemy spawn rates, health, damage, and the chance for Elite enemies to spawn.
* Each subsequent stage also provides a baseline increase in difficulty.

### 6.2. Enemy Roster
* **Grunt (Wasp Drone):** Basic melee enemy. Moves directly toward the player.
* **Spitter (Spore Turret):** Stationary ranged enemy. Lobs a slow, arcing projectile.
* **Charger (Jungle Boar):** Telegraphs its attack, then rushes forward at high speed.
* **Elite Enemies:** Normal enemies can spawn as Elites with a visual aura and a special modifier (e.g., **Glacial:** Slows players on hit. **Overloading:** Has a shield and zaps nearby players).

## 7. Multiplayer Rules
* **Loot:** All interactables are first-come, first-served. This encourages communication.
* **Difficulty:** Enemy health and the Director's credit budget scale with player count.
* **Revival:** When a player dies, they become a "Ghost." They can be revived if a living player remains within their revival circle for 10 seconds. If all players are ghosts, the run ends.

## 8. Meta-Progression
* **Focus on Unlocks, Not Power:** No permanent stat upgrades between runs.
* **Challenges:** An in-game list of challenges (e.g., "Complete Stage 3," "Collect 10 Energy Drinks in one run").
* **Rewards:** Completing challenges unlocks new Items, Equipment, and playable Researchers for all future runs.

## 9. Technical Implementation Blueprint

### 9.1. Recommended Technology Stack
* **Game Engine (Frontend):** [Phaser 3](https://phaser.io/) - A fast, mature 2D JavaScript game framework.
* **Networking/Backend Framework:** [Colyseus](https://www.colyseus.io/) - A Node.js framework for multiplayer games.
* **Language:** [TypeScript](https://www.typescriptlang.org/) for both frontend and backend to ensure type safety and shared data structures.
* **Server Environment:** [Node.js](https://nodejs.org/)

### 9.2. Backend Architecture (Server-Side)
* **Authoritative Server:** The server is the single source of truth. The server simulates the entire game state. The client is only responsible for rendering and sending input.
* **Colyseus Room:** Each game session is a Colyseus `Room`. The room's logic handles the game loop, player connections, and state management.
* **State Schema (Colyseus Schema):** The `RoomState` must be strictly defined.
    ```typescript
    class PlayerState extends Schema {
      @type("string") name: string;
      @type("number") x: number;
      @type("number") y: number;
      @type("number") maxHealth: number;
      @type("number") currentHealth: number;
      // ...other stats
    }

    class RoomState extends Schema {
      @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
      @type({ map: EnemyState }) enemies = new MapSchema<EnemyState>();
      // ...other maps for projectiles, interactables, etc.
    }
    ```
* **Game Loop:** Use `room.setSimulationInterval()` to create a fixed-tick game loop (e.g., 20 ticks per second). All game logic (movement, AI, physics, hit detection) happens inside this loop on the server.
* **Logic:**
    * Player input from clients modifies player velocity, which is then applied in the server loop to calculate the new position.
    * The Director logic runs once at the start of each stage to populate the `interactables` state map.
    * Enemy AI and spawning logic run continuously within the game loop.

### 9.3. Frontend Architecture (Client-Side)
* **Dumb Client:** The Phaser client is for rendering only. It should not contain any game logic. Its primary job is to reflect the state sent by the server.
* **Phaser Scenes:** Use different scenes for the Main Menu, Lobby, and the main Game itself.
* **State Synchronization:**
    * On connecting, the client receives the full game state.
    * The Colyseus client library provides `onAdd`, `onChange`, and `onRemove` listeners for every part of the state.
    * **Example:** `room.state.enemies.onAdd((enemy, key) => { ... })` should create a new enemy sprite in Phaser. `enemy.onChange = (changes) => { ... }` should update that sprite's position.
* **Input Handling:** The Phaser `update()` loop captures keyboard/mouse input and sends it to the server via `room.send("input", { ... })` on every frame. It **does not** move the player sprite directly.
* **Client-Side Prediction & Interpolation:** For smooth visuals, the client should interpolate sprite positions between server updates. For responsive input, basic client-side prediction can be implemented for the local player's movement, with the server correcting the position if needed.

### 9.4. Networking Model
* **Protocol:** WebSockets (managed by Colyseus).
* **Client-to-Server Messages:**
    * `input`: A small binary message sent every frame containing the current state of player inputs (e.g., `{ left: true, up: false, dash: false }`).
    * `activateEquipment`: Sent once when the equipment key is pressed.
    * `interact`: A message sent when a player attempts to interact with an object like a Tri-Shop or Altar.
* **Server-to-Client Communication:** Primarily handled by Colyseus's automatic state synchronization. The server modifies its state, and Colyseus efficiently broadcasts the changes to all clients.

## 10. Asset & Data Structure (For LLM Implementation)

### 10.1. Asset Handling
* All game graphics (sprites, icons) should be loaded from simple PNG files. Use placeholder graphics (`placeholder_player.png`) during initial development.
* A single texture atlas for UI elements and another for game sprites is recommended for performance.

### 10.2. Data Structure Examples
Use JSON or JavaScript objects to define all game content.

**Item Data Structure (`items.json`):**
```json
{
  "energyDrink": {
    "id": "energyDrink",
    "name": "Energy Drink",
    "description": "Increases attack speed by 10% <style=cStack>(+10% per stack)</style>.",
    "icon": "icons/energy_drink.png",
    "rarity": "common",
    "stackingType": "linear",
    "effects": [{ "stat": "attackSpeed", "value": 0.10, "type": "percentage" }]
  },
  "chainLightning": {
    "id": "chainLightning",
    "name": "Unstable Tesla Coil",
    "description": "Zap a nearby enemy for 80% damage every 0.5s. Hits 2 <style=cStack>(+1 per stack)</style> additional targets.",
    "icon": "icons/tesla_coil.png",
    "rarity": "rare",
    "stackingType": "special",
    "effects": [{ "trigger": "onTimer", "effect": "spawnChainLightning" }]
  }
}
```

**Character Data Structure (`characters.json`):**
```json
{
  "researcherLemur": {
    "id": "researcherLemur",
    "name": "Field Scientist Pip",
    "spriteSheet": "sprites/lemur.png",
    "baseStats": {
      "maxHealth": 100, "healthRegen": 1.0, "damage": 12, "moveSpeed": 7.0, "armor": 0
    },
    "primaryWeapon": { "id": "dartGun" }
  }
}
```

**Enemy Data Structure (`enemies.json`):**
```json
{
  "waspDrone": {
    "id": "waspDrone",
    "name": "Wasp Drone",
    "sprite": "sprites/wasp_drone.png",
    "baseStats": { "maxHealth": 30, "damage": 8, "moveSpeed": 4.5 },
    "behavior": "seekPlayer",
    "attackType": "melee"
  }
}