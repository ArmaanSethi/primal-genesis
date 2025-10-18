import { Room, Client } from "colyseus";
import { MyRoomState, Player, Enemy, Projectile } from "./schema/MyRoomState";
import characterData from "../data/characters.json";
import enemyData from "../data/enemies.json";
import { v4 as uuidv4 } from 'uuid';

export class MyRoom extends Room<MyRoomState> {
  private spawnTimer: number = 0;
  private SPAWN_INTERVAL: number = 500; // milliseconds (spawn faster)
  private MAX_ENEMIES: number = 50; // More enemies

  onCreate (options: any) {
    if (options.SPAWN_INTERVAL) {
      this.SPAWN_INTERVAL = options.SPAWN_INTERVAL;
    }
    if (options.MAX_ENEMIES) {
      this.MAX_ENEMIES = options.MAX_ENEMIES;
    }
    this.setState(new MyRoomState());

    // Set up the game loop
    this.setSimulationInterval(this.update.bind(this));

    // Handle player input
    this.onMessage("input", (client, input: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputX = input.x;
        player.inputY = input.y;
      }
    });
  }

  private noop = (...args: any[]) => {};
  private log = console.log;

  update = (deltaTime: number) => {
    this.log(`Update method called. DeltaTime: ${deltaTime}`);
    this.log(`Number of enemies: ${this.state.enemies.size}`);
    this.log(`Number of players: ${this.state.players.size}`);

    // Enemy spawning logic
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.state.enemies.size < this.MAX_ENEMIES) {
      const availableEnemyTypes = ["waspDrone", "spitter", "charger"];
      const randomEnemyTypeId = availableEnemyTypes[Math.floor(Math.random() * availableEnemyTypes.length)];
      const enemyType = enemyData[randomEnemyTypeId as keyof typeof enemyData];

      if (enemyType) {
        const enemy = new Enemy();
        const stats = enemyType.baseStats;
        const id = uuidv4();

        enemy.id = id;
        enemy.typeId = randomEnemyTypeId;

        // Spawn enemies just off-screen relative to a player's camera
        const playersArray = Array.from(this.state.players.values());
        if (playersArray.length > 0) {
          // Pick a random player to spawn near
          const randomPlayerIndex = Math.floor(Math.random() * playersArray.length);
          const player = playersArray[randomPlayerIndex];
                      this.log(`Spawning enemy near player ${player.sessionId} at (${player.x}, ${player.y})`); // Debug player position for spawn

          const minSpawnDistance = 300; // Minimum distance from player
          const spawnRadius = 600; // Maximum radius around the player to spawn enemies
          let spawnX, spawnY, distance;
          do {
            const angle = Math.random() * Math.PI * 2; // Random angle around the player
            distance = minSpawnDistance + (Math.random() * (spawnRadius - minSpawnDistance)); // Random distance between min and max

            spawnX = player.x + Math.cos(angle) * distance;
            spawnY = player.y + Math.sin(angle) * distance;

            // Clamp to world boundaries
            spawnX = Math.max(0, Math.min(this.state.worldWidth, spawnX));
            spawnY = Math.max(0, Math.min(this.state.worldHeight, spawnY));

            // Recalculate distance from player to clamped spawn point
            distance = Math.hypot(spawnX - player.x, spawnY - player.y);
          } while (distance < minSpawnDistance); // Keep trying until a valid spawn point is found

          enemy.x = spawnX;
          enemy.y = spawnY;
                      this.log(`Enemy ${enemy.id} (type: ${enemy.typeId}) spawned at (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)}) near player ${player.sessionId} at (${player.x.toFixed(2)}, ${player.y.toFixed(2)}). Calculated distance: ${distance.toFixed(2)}`); // Debug enemy spawn position
        } else {
          // Fallback: if no players, spawn randomly (shouldn't happen in normal gameplay)
          enemy.x = Math.random() * this.state.worldWidth;
          enemy.y = Math.random() * this.state.worldHeight;
          this.log(`Enemy ${enemy.id} spawned randomly at (${enemy.x}, ${enemy.y}) (no players)`);
        }

        enemy.maxHealth = stats.maxHealth;
        enemy.health = stats.health;
        enemy.damage = stats.damage;
        enemy.moveSpeed = stats.moveSpeed;
        enemy.attackCooldown = 0;
        enemy.attackRange = (enemyType as any).attackRange || 0;
        enemy.projectileType = (enemyType as any).projectileType || "";

        this.state.enemies.set(id, enemy);
      }
      this.spawnTimer = 0;
    }

    // Player movement and attack
    this.state.players.forEach((player) => {
      const speed = player.moveSpeed;
      if (player.inputX !== 0 || player.inputY !== 0) {
        player.x += player.inputX * speed;
        player.y += player.inputY * speed;

        player.x = Math.max(0, Math.min(this.state.worldWidth, player.x));
        player.y = Math.max(0, Math.min(this.state.worldHeight, player.y));
      }

      // Automatic attack logic (now fires projectiles)
      if (player.attackCooldown <= 0) {
        this.log(`Player ${player.sessionId} attack cooldown met. Looking for enemy.`);
        let nearestEnemy: Enemy | null = null;
        let minDistance = Infinity;
        const attackRange = 300; // Example attack range for projectile firing

        this.state.enemies.forEach((enemy) => {
          const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
          if (distance <= attackRange && distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
          }
        });

        if (nearestEnemy) {
          this.log(`Player ${player.sessionId} found nearest enemy ${(nearestEnemy as Enemy).id}. Creating projectile.`);
          const targetEnemy = nearestEnemy as Enemy;
          const projectileId = uuidv4();
          const angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);

          const projectile = new Projectile();
          projectile.id = projectileId;
          projectile.x = player.x;
          projectile.y = player.y;
          projectile.rotation = angle;
          projectile.speed = player.projectileSpeed;
          projectile.damage = player.damage;
          projectile.ownerId = player.sessionId;
          projectile.timeToLive = 2; // Player projectiles last for 2 seconds
          this.log(`DEBUG: Player projectile ${projectileId} about to be added to state. TTL: ${projectile.timeToLive.toFixed(2)}`);

          this.state.projectiles.set(projectileId, projectile);
          this.log(`Player projectile ${projectileId} created at (${projectile.x.toFixed(2)}, ${projectile.y.toFixed(2)}) with speed ${projectile.speed}, rotation ${projectile.rotation.toFixed(2)})`);
          player.attackCooldown = 1 / player.attackSpeed; // Reset cooldown
        } else {
          this.log(`Player ${player.sessionId} attack cooldown met, but no enemy in range.`);
        }
      } else {
        player.attackCooldown -= deltaTime / 1000; // Reduce cooldown
        this.log(`Player ${player.sessionId} attack cooldown: ${player.attackCooldown.toFixed(2)}`);
      }
    });

    // Projectile movement and collision
    const projectilesArray: Projectile[] = Array.from(this.state.projectiles.values());
    for (const projectile of projectilesArray) {
      // Update timeToLive
      projectile.timeToLive -= deltaTime / 1000;
      if (projectile.timeToLive <= 0) {
        this.state.projectiles.delete(projectile.id);
        this.log(`Projectile ${projectile.id} removed due to timeToLive.`);
        continue; // Skip further processing for this projectile
      }

      this.log(`Projectile ${projectile.id} at (${projectile.x.toFixed(2)}, ${projectile.y.toFixed(2)}). TTL: ${projectile.timeToLive.toFixed(2)}`);
      // @ts-ignore
      projectile.x += Math.cos(projectile.rotation) * projectile.speed * (deltaTime / 1000);
      // @ts-ignore
      projectile.y += Math.sin(projectile.rotation) * projectile.speed * (deltaTime / 1000);

      // Check for collision with enemies
      for (const enemy of this.state.enemies.values()) {
        const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
        const collisionRadius = 20; // Increased collision radius for projectile and enemy

        if (distance < collisionRadius) {
          // Collision detected
          enemy.health -= projectile.damage;
                          this.log(`Projectile hit enemy ${enemy.typeId}. Enemy health: ${enemy.health}`);
          if (enemy.health <= 0) {
            this.state.enemies.delete(enemy.id);
                            this.log(`Enemy ${enemy.typeId} destroyed!`);          }

          this.state.projectiles.delete(projectile.id); // Remove projectile on hit
          break; // Only hit one enemy per projectile
        }
      }

      // Remove projectiles that go out of bounds
      if (projectile.x < 0 || projectile.x > this.state.worldWidth ||
          projectile.y < 0 || projectile.y > this.state.worldHeight) {
        this.state.projectiles.delete(projectile.id);
        this.log(`Projectile ${projectile.id} removed out of bounds.`);
      }
    }

    // Enemy AI
    const playersArray = Array.from(this.state.players.values());
    if (playersArray.length === 0) {
      return; // No players to target
    }

    this.state.enemies.forEach((enemy) => {
      const enemyTypeData = enemyData[enemy.typeId as keyof typeof enemyData];

      if (!enemyTypeData) {
        return; // Should not happen, but defensive check
      }

      // Find the closest player
      let closestPlayer = playersArray[0];
      let minDistance = Math.hypot(enemy.x - closestPlayer.x, enemy.y - closestPlayer.y);

      for (let i = 1; i < playersArray.length; i++) {
        const player = playersArray[i];
        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestPlayer = player;
        }
      }

      // Ranged attack logic for stationary enemies (Spitter)
      if (enemyTypeData.behavior === "stationary" && enemyTypeData.attackType === "ranged") {
        this.log(`Spitter ${enemy.id} is being processed.`);
        if (enemy.attackCooldown <= 0 && minDistance <= enemy.attackRange) {
          this.log(`Spitter ${enemy.id} attack cooldown ready and player in range. Firing projectile.`);
          const projectileId = uuidv4();
          const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);

          const projectile = new Projectile();
          projectile.id = projectileId;
          projectile.x = enemy.x;
          projectile.y = enemy.y;
          projectile.rotation = angle;
          projectile.speed = 200; // Use defined or default, reduced for visibility
          projectile.damage = enemy.damage; // Use enemy's current damage
          projectile.ownerId = enemy.id;
          projectile.projectileType = enemy.projectileType; // Assign the specific projectile type
          projectile.timeToLive = 5; // Projectile lasts for 5 seconds
          this.log(`DEBUG: Spitter projectile ${projectileId} about to be added to state. projectileType: ${projectile.projectileType}, timeToLive: ${projectile.timeToLive.toFixed(2)}`);

          this.state.projectiles.set(projectileId, projectile);
          this.log(`Spitter projectile ${projectileId} created at (${projectile.x.toFixed(2)}, ${projectile.y.toFixed(2)}) with speed ${projectile.speed}, rotation ${projectile.rotation.toFixed(2)}, and type ${projectile.projectileType})`);
          enemy.attackCooldown = 1 / enemyTypeData.baseStats.attackSpeed; // Reset cooldown
        } else if (enemy.attackCooldown > 0) {
          this.log(`Spitter ${enemy.id} attack cooldown: ${enemy.attackCooldown.toFixed(2)}`);
        } else if (minDistance > enemy.attackRange) {
          this.log(`Spitter ${enemy.id} player out of range. Distance: ${minDistance.toFixed(2)} Range: ${enemy.attackRange}`);
        }
      } else if (enemyTypeData.behavior === "seekPlayer") { // Movement logic for seekPlayer enemies (WaspDrone)
        const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
        const moveX = Math.cos(angle) * enemy.moveSpeed * (deltaTime / 1000);
        const moveY = Math.sin(angle) * enemy.moveSpeed * (deltaTime / 1000);

        enemy.x += moveX;
        enemy.y += moveY;

        this.log(`Enemy ${enemy.id} moving from (${enemy.x}, ${enemy.y})`);

        // Clamp enemy position to world boundaries
        enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
        enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));

      } else if (enemyTypeData.behavior === "charge") { // Charger behavior
        this.log(`Charger ${enemy.id} START processing. isCharging: ${enemy.isCharging}, chargeCooldown: ${enemy.chargeCooldown.toFixed(2)}`);
        if (!enemy.isCharging && enemy.chargeCooldown <= 0) {
          // Telegraph phase: set target and start a short cooldown
          enemy.isCharging = true;
          enemy.chargeTargetX = closestPlayer.x;
          enemy.chargeTargetY = closestPlayer.y;
          enemy.telegraphTimer = 0.5; // Telegraph duration
          this.log(`Charger ${enemy.id} telegraphing charge towards (${enemy.chargeTargetX.toFixed(2)}, ${enemy.chargeTargetY.toFixed(2)}). isCharging: ${enemy.isCharging}, telegraphTimer: ${enemy.telegraphTimer.toFixed(2)}`);
        } else if (enemy.isCharging && enemy.telegraphTimer > 0) {
          // Still telegraphing
          enemy.telegraphTimer -= deltaTime / 1000;
          this.log(`Charger ${enemy.id} telegraphing... remaining: ${enemy.telegraphTimer.toFixed(2)}. isCharging: ${enemy.isCharging}`);
        } else if (enemy.isCharging && enemy.telegraphTimer <= 0) {
          // Charge phase: move rapidly towards target
          const angle = Math.atan2(enemy.chargeTargetY - enemy.y, enemy.chargeTargetX - enemy.x);
          const moveX = Math.cos(angle) * (enemyTypeData as any).chargeSpeed * (deltaTime / 1000);
          const moveY = Math.sin(angle) * (enemyTypeData as any).chargeSpeed * (deltaTime / 1000);

          this.log(`Charger ${enemy.id} BEFORE move: (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)}). isCharging: ${enemy.isCharging}, telegraphTimer: ${enemy.telegraphTimer.toFixed(2)}`);
          enemy.x += moveX;
          enemy.y += moveY;
          this.log(`Charger ${enemy.id} AFTER move: (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)}). Target: (${enemy.chargeTargetX.toFixed(2)}, ${enemy.chargeTargetY.toFixed(2)}). isCharging: ${enemy.isCharging}, telegraphTimer: ${enemy.telegraphTimer.toFixed(2)}`);
          // Re-assign the enemy to the map to force Colyseus to send updates
          this.state.enemies.set(enemy.id, enemy);

          // Check if target reached or passed
          const distanceToTarget = Math.hypot(enemy.x - enemy.chargeTargetX, enemy.y - enemy.chargeTargetY);
          if (distanceToTarget < 10) { // Close enough to target
            enemy.isCharging = false;
            enemy.chargeCooldown = 3; // Longer cooldown after charge
            this.log(`Charger ${enemy.id} reached target. Resetting. isCharging: ${enemy.isCharging}, chargeCooldown: ${enemy.chargeCooldown.toFixed(2)}`);
          }
        }

        // Clamp enemy position to world boundaries (even during charge)
        enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
        enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));
      }

      // Reduce enemy attack cooldown (applies to both melee and ranged where applicable)
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime / 1000;
      }

      // Reduce charge cooldown if not charging
      if (!enemy.isCharging && enemy.chargeCooldown > 0) {
        enemy.chargeCooldown -= deltaTime / 1000;
      }
    }); // This brace closes the this.state.enemies.forEach((enemy) => { loop

    // Enemy-Player Collision and Damage
    this.state.enemies.forEach((enemy) => {
      this.state.players.forEach((player) => {
        const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        const collisionRadius = 24; // Approximate collision radius for enemy and player

        if (distance < collisionRadius && enemy.attackCooldown <= 0) {
          player.health -= enemy.damage;
          this.log(`Player ${player.sessionId} hit by enemy ${enemy.id}. Health: ${player.health}`);
          enemy.attackCooldown = 1; // 1 second cooldown for enemy attack

          if (player.health <= 0) {
            this.log(`Player ${player.sessionId} died!`);
            this.state.players.delete(player.sessionId);
          }
        }
      });

      // Reduce enemy attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime / 1000;
      }
    });
  } // This brace closes the update = (deltaTime: number) => { method

  onJoin(client: Client, options: any) {
    this.log(client.sessionId, "joined!");
    const player = new Player();
    player.sessionId = client.sessionId; // Assign sessionId
    const stats = characterData.bioResearcher.stats;

    player.maxHealth = stats.maxHealth;
    player.health = stats.maxHealth; // Start with full health
    player.healthRegen = stats.healthRegen;
    player.damage = stats.damage;
    player.attackSpeed = stats.attackSpeed;
    player.projectileSpeed = stats.projectileSpeed; // Initialize projectile speed
    player.moveSpeed = stats.moveSpeed;
    player.armor = stats.armor;
    player.critChance = stats.critChance;
    player.attackCooldown = 0; // Initialize attack cooldown

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    this.log("room", this.roomId, client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    this.log("room", this.roomId, "disposing...");
  }

}
