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
  private log = this.noop;

  update = (deltaTime: number) => {
    this.log(`Update method called. DeltaTime: ${deltaTime}`);
    this.log(`Number of enemies: ${this.state.enemies.size}`);
    this.log(`Number of players: ${this.state.players.size}`);

    // Enemy spawning logic
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.state.enemies.size < this.MAX_ENEMIES) {
      const enemyType = enemyData["waspDrone" as keyof typeof enemyData];
      if (enemyType) {
        const enemy = new Enemy();
        const stats = enemyType.baseStats;
        const id = uuidv4();

        enemy.id = id;
        enemy.typeId = "waspDrone";

        // Spawn enemies just off-screen relative to a player's camera
        const playersArray = Array.from(this.state.players.values());
        if (playersArray.length > 0) {
          // Pick a random player to spawn near
          const randomPlayerIndex = Math.floor(Math.random() * playersArray.length);
          const player = playersArray[randomPlayerIndex];
                      this.log(`Spawning enemy near player ${player.sessionId} at (${player.x}, ${player.y})`); // Debug player position for spawn

          const spawnRadius = 400; // Radius around the player to spawn enemies (increased for better visibility)
          const angle = Math.random() * Math.PI * 2; // Random angle around the player
          const distance = Math.random() * spawnRadius; // Random distance within the radius

          enemy.x = player.x + Math.cos(angle) * distance;
          enemy.y = player.y + Math.sin(angle) * distance;

          // Clamp enemy position to world boundaries
          enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
          enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));
                      this.log(`Enemy ${enemy.id} spawned at (${enemy.x}, ${enemy.y})`); // Debug enemy spawn position
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

          this.state.projectiles.set(projectileId, projectile);
          player.attackCooldown = 1 / player.attackSpeed; // Reset cooldown
        }
      } else {
        player.attackCooldown -= deltaTime / 1000; // Reduce cooldown
      }
    });

    // Projectile movement and collision
    const projectilesArray: Projectile[] = Array.from(this.state.projectiles.values());
    for (const projectile of projectilesArray) {
      // @ts-ignore
      projectile.x += Math.cos(projectile.rotation) * projectile.speed * (deltaTime / 1000);
      // @ts-ignore
      projectile.y += Math.sin(projectile.rotation) * projectile.speed * (deltaTime / 1000);

      // Check for collision with enemies
      for (const enemy of this.state.enemies.values()) {
        const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
        const collisionRadius = 16; // Approximate collision radius for projectile and enemy

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
      }
    }

    // Enemy AI
    const playersArray = Array.from(this.state.players.values());
    if (playersArray.length === 0) {
      return; // No players to target
    }

    this.state.enemies.forEach((enemy) => {
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

      // Move enemy towards the determined closest player
      const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
      const moveX = Math.cos(angle) * enemy.moveSpeed * (deltaTime / 1000);
      const moveY = Math.sin(angle) * enemy.moveSpeed * (deltaTime / 1000);

      enemy.x += moveX;
      enemy.y += moveY;

            this.log(`Enemy ${enemy.id} moving from (${enemy.x}, ${enemy.y})`);

      // Clamp enemy position to world boundaries
      enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
      enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));
    });
  }

  onJoin (client: Client, options: any) {
            this.log(client.sessionId, "joined!");    const player = new Player();
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

  onLeave (client: Client, consented: boolean) {
            this.log("room", this.roomId, client.sessionId, "left!");    this.state.players.delete(client.sessionId);
  }

  onDispose() {
            this.log("room", this.roomId, "disposing...");  }

}
