import { Room, Client } from "colyseus";
import { MyRoomState, Player, Enemy } from "./schema/MyRoomState";
import characterData from "../data/characters.json";
import enemyData from "../data/enemies.json";
import { v4 as uuidv4 } from 'uuid';

export class MyRoom extends Room<MyRoomState> {

  onCreate (options: any) {
    this.setState(new MyRoomState());

    this.spawnEnemy("waspDrone");

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    // Handle player input
    this.onMessage("input", (client, input: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputX = input.x;
        player.inputY = input.y;
      }
    });
  }

  spawnEnemy(typeId: string) {
    const enemyType = enemyData[typeId as keyof typeof enemyData];
    if (!enemyType) {
      console.warn(`Unknown enemy type: ${typeId}`);
      return;
    }

    const enemy = new Enemy();
    const stats = enemyType.baseStats;
    const id = uuidv4();

    enemy.typeId = typeId;
    enemy.x = Math.random() * 800;
    enemy.y = Math.random() * 600;
    enemy.maxHealth = stats.maxHealth;
    enemy.health = stats.health;
    enemy.damage = stats.damage;
    enemy.moveSpeed = stats.moveSpeed;

    this.state.enemies.set(id, enemy);
  }

  update(deltaTime: number) {
    // Player movement and attack
    this.state.players.forEach((player) => {
      const speed = player.moveSpeed;
      if (player.inputX !== 0 || player.inputY !== 0) {
        player.x += player.inputX * speed;
        player.y += player.inputY * speed;

        player.x = Math.max(0, Math.min(this.state.worldWidth, player.x));
        player.y = Math.max(0, Math.min(this.state.worldHeight, player.y));
      }

      // Automatic attack logic
      if (player.attackCooldown <= 0) {
        let nearestEnemy: Enemy | null = null;
        let minDistance = Infinity;
        const attackRange = 100; // Example attack range

        this.state.enemies.forEach((enemy) => {
          const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
          if (distance <= attackRange && distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
          }
        });

        if (nearestEnemy) {
          const targetEnemy = nearestEnemy;
          // Attack the enemy
          targetEnemy.health -= player.damage;
          console.log(`Player attacked enemy ${targetEnemy.typeId}. Enemy health: ${targetEnemy.health}`);
          player.attackCooldown = 1 / player.attackSpeed; // Reset cooldown based on attack speed
        }
      } else {
        player.attackCooldown -= deltaTime / 1000; // Reduce cooldown based on delta time
      }
    });

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
      enemy.x += Math.cos(angle) * enemy.moveSpeed;
      enemy.y += Math.sin(angle) * enemy.moveSpeed;

      // Clamp enemy position to world boundaries
      enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
      enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
    const stats = characterData.bioResearcher.stats;

    player.maxHealth = stats.maxHealth;
    player.health = stats.maxHealth; // Start with full health
    player.healthRegen = stats.healthRegen;
    player.damage = stats.damage;
    player.attackSpeed = stats.attackSpeed;
    player.moveSpeed = stats.moveSpeed;
    player.armor = stats.armor;
    player.critChance = stats.critChance;

    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}