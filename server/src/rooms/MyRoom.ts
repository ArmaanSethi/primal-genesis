import { Room, Client } from "colyseus";
import { MyRoomState, Player, Enemy, Projectile, ItemState, ItemEffect, InteractableState, XPEntityState } from "./schema/MyRoomState";
import characterData from "../data/characters.json";
import enemyData from "../data/enemies.json";
import itemData from "../data/items.json";
import { v4 as uuidv4 } from 'uuid';

export class MyRoom extends Room<MyRoomState> {
  private spawnTimer: number = 0;
  private SPAWN_INTERVAL!: number; // milliseconds (spawn faster)
  private MAX_ENEMIES!: number; // More enemies

  // Director system for map population
  private readonly STAGE_CREDITS: number = 500; // Starting credit budget
  private interactableSpawnCooldown: number = 0;

  // Beacon system
  private beaconId: string | null = null;
  private readonly BEACON_ACTIVATION_TIME: number = 90; // 90 seconds
  private readonly BOSS_SPAWN_DELAY: number = 2000; // 2 seconds after beacon activation

  onCreate (options: any) {
    this.SPAWN_INTERVAL = 500; // milliseconds (spawn faster)
    this.MAX_ENEMIES = 50; // More enemies
    this.setState(new MyRoomState());

    // Set up the game loop
    this.setSimulationInterval(this.update.bind(this));

    // Initialize map with interactables
    this.populateMap();

    // Handle player input
    this.onMessage("input", (client, input: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputX = input.x;
        player.inputY = input.y;
      }
    });

    // Handle equipment usage
    this.onMessage("useEquipment", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        console.log(`🛡️ Player ${client.sessionId} attempting to use equipment`);

        // Check if player has equipment items
        const equipmentItems = player.items.filter(item => item.rarity === "equipment");
        if (equipmentItems.length > 0) {
          const equipment = equipmentItems[0]; // Use first equipment item

          // Check for equipment cooldown
          if (player.attackCooldown <= 0) {
            console.log(`🛡️ Activating equipment: ${equipment.name}`);

            // Apply equipment effects based on type
            equipment.effects.forEach(effect => {
              if (effect.trigger === "onActivate") {
                if (effect.effect === "dashAttack") {
                  // Quantum Phase Shifter - Dash attack
                  this.executeDashAttack(player, (effect as any).damage || 50);
                } else if (effect.effect === "grenade") {
                  // Alien Spore Pod - Throw grenade
                  this.throwGrenade(player, (effect as any).damage || 200, (effect as any).radius || 150);
                }
              }
            });

            // Set equipment cooldown
            player.attackCooldown = (equipment as any).cooldown || 3; // 3 second default cooldown
          } else {
            console.log(`🛡️ Equipment on cooldown: ${player.attackCooldown.toFixed(1)}s`);
          }
        } else {
          console.log(`🛡️ Player has no equipment to use`);
        }
      }
    });
  }

  private noop = (...args: any[]) => {};
  private log = console.log;

  // Item System Helper Methods
  private generateRandomItem(rarity?: string): ItemState | null {
    const availableItems = Object.values(itemData).filter(item => !rarity || item.rarity === rarity);
    if (availableItems.length === 0) return null;

    const selectedItemData = availableItems[Math.floor(Math.random() * availableItems.length)];
    const item = new ItemState();

    item.id = selectedItemData.id;
    item.name = selectedItemData.name;
    item.description = selectedItemData.description;
    item.icon = selectedItemData.icon;
    item.rarity = selectedItemData.rarity;
    item.stackingType = selectedItemData.stackingType;

    // Convert effects to ItemEffect schema objects
    selectedItemData.effects.forEach((effectData: any) => {
      const effect = new ItemEffect();
      effect.stat = effectData.stat || "";
      effect.value = effectData.value || 0;
      effect.type = effectData.type || "";
      effect.trigger = effectData.trigger || "";
      effect.effect = effectData.effect || "";
      effect.interval = effectData.interval || 0;
      effect.targets = effectData.targets || 0;
      effect.radius = effectData.radius || 0;
      effect.cooldown = effectData.cooldown || 0;
      item.effects.push(effect);
    });

    return item;
  }

  private applyItemEffectsToPlayer(player: Player): void {
    // Reset calculated stats to base values
    player.calculatedMaxHealth = player.maxHealth;
    player.calculatedHealthRegen = player.healthRegen;
    player.calculatedDamage = player.damage;
    player.calculatedAttackSpeed = player.attackSpeed;
    player.calculatedProjectileSpeed = player.projectileSpeed;
    player.calculatedMoveSpeed = player.moveSpeed;
    player.calculatedArmor = player.armor;
    player.calculatedCritChance = player.critChance;

    // Apply item effects
    player.items.forEach((item: ItemState) => {
      item.effects.forEach((effect: ItemEffect) => {
        switch (effect.stat) {
          case "maxHealth":
            player.calculatedMaxHealth += effect.type === "percentage"
              ? player.maxHealth * effect.value
              : effect.value;
            break;
          case "healthRegen":
            player.calculatedHealthRegen += effect.type === "percentage"
              ? player.healthRegen * effect.value
              : effect.value;
            break;
          case "damage":
            player.calculatedDamage += effect.type === "percentage"
              ? player.damage * effect.value
              : effect.value;
            break;
          case "attackSpeed":
            player.calculatedAttackSpeed += effect.type === "percentage"
              ? player.attackSpeed * effect.value
              : effect.value;
            break;
          case "projectileSpeed":
            player.calculatedProjectileSpeed += effect.type === "percentage"
              ? player.projectileSpeed * effect.value
              : effect.value;
            break;
          case "moveSpeed":
            player.calculatedMoveSpeed += effect.type === "percentage"
              ? player.moveSpeed * effect.value
              : effect.value;
            break;
          case "armor":
            player.calculatedArmor += effect.type === "percentage"
              ? player.armor * effect.value
              : effect.value;
            break;
          case "critChance":
            player.calculatedCritChance += effect.type === "percentage"
              ? player.critChance * effect.value
              : effect.value;
            break;
        }
      });
    });

    // Apply soft limits with diminishing returns for extreme stacking
    // This allows natural item synergy while preventing completely broken values
    if (player.calculatedMoveSpeed > 20) {
      const excess = player.calculatedMoveSpeed - 20;
      player.calculatedMoveSpeed = 20 + Math.sqrt(excess) * 2; // Diminishing returns after 20
    }
    if (player.calculatedDamage > 150) {
      const excess = player.calculatedDamage - 150;
      player.calculatedDamage = 150 + Math.sqrt(excess) * 5; // Diminishing returns after 150
    }
    if (player.calculatedAttackSpeed > 4) {
      const excess = player.calculatedAttackSpeed - 4;
      player.calculatedAttackSpeed = 4 + Math.sqrt(excess) * 0.5; // Diminishing returns after 4
    }
    if (player.calculatedCritChance > 0.75) {
      const excess = player.calculatedCritChance - 0.75;
      player.calculatedCritChance = 0.75 + Math.sqrt(excess) * 0.1; // Diminishing returns after 75%
      player.calculatedCritChance = Math.min(player.calculatedCritChance, 0.95); // Hard cap at 95%
    }
  }

  private populateMap(): void {
    const availableInteractables = [
      { type: "smallChest", cost: 10, weight: 40 },
      { type: "largeChest", cost: 25, weight: 20 },
      { type: "equipmentBarrel", cost: 15, weight: 30 },
      { type: "triShop", cost: 20, weight: 10 }
    ];

    let remainingCredits = this.STAGE_CREDITS;
    let attempts = 0;
    const maxAttempts = 100;

    while (remainingCredits > 0 && attempts < maxAttempts) {
      // Weighted random selection
      const totalWeight = availableInteractables.reduce((sum, i) => sum + i.weight, 0);
      let random = Math.random() * totalWeight;

      let selectedInteractable = availableInteractables[0];
      for (const interactable of availableInteractables) {
        random -= interactable.weight;
        if (random <= 0) {
          selectedInteractable = interactable;
          break;
        }
      }

      if (remainingCredits >= selectedInteractable.cost) {
        // Find valid spawn position
        const x = Math.random() * (this.state.worldWidth - 100) + 50;
        const y = Math.random() * (this.state.worldHeight - 100) + 50;

        // Check minimum distance from players
        const minDistanceFromPlayers = 200;
        const tooClose = Array.from(this.state.players.values()).some(player =>
          Math.hypot(player.x - x, player.y - y) < minDistanceFromPlayers
        );

        if (!tooClose) {
          const interactableState = new InteractableState();
          interactableState.id = uuidv4();
          interactableState.type = selectedInteractable.type;
          interactableState.x = x;
          interactableState.y = y;
          interactableState.isOpen = false;

          // Set specific properties based on type
          if (selectedInteractable.type === "largeChest") {
            interactableState.itemRarity = "uncommon"; // Large chests guarantee uncommon or better
          } else if (selectedInteractable.type === "triShop") {
            interactableState.choiceCount = 3;
          }

          this.state.interactables.set(interactableState.id, interactableState);
          remainingCredits -= selectedInteractable.cost;
        }
      }

      attempts++;
    }

    // Spawn the Bio-Resonance Beacon
    this.spawnBeacon();
  }

  private spawnBeacon(): void {
    // Find a good location for the beacon (away from player spawn)
    let beaconX = Math.random() * (this.state.worldWidth - 200) + 100;
    let beaconY = Math.random() * (this.state.worldHeight - 200) + 100;

    // Ensure beacon is not too close to any players
    const playersArray = Array.from(this.state.players.values());
    for (const player of playersArray) {
      const distance = Math.hypot(player.x - beaconX, player.y - beaconY);
      if (distance < 500) {
        // If too close to a player, relocate beacon
        const angle = Math.random() * Math.PI * 2;
        const distance = 500 + Math.random() * 200;
        beaconX = player.x + Math.cos(angle) * distance;
        beaconY = player.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        beaconX = Math.max(100, Math.min(this.state.worldWidth - 100, beaconX));
        beaconY = Math.max(100, Math.min(this.state.worldHeight - 100, beaconY));
      }
    }

    // Create the beacon interactable
    const beacon = new InteractableState();
    beacon.id = uuidv4();
    beacon.type = "bioResonanceBeacon";
    beacon.x = beaconX;
    beacon.y = beaconY;
    beacon.isOpen = false;

    this.state.interactables.set(beacon.id, beacon);
    this.beaconId = beacon.id;

    // this.log(`Bio-Resonance Beacon spawned at (${beaconX.toFixed(0)}, ${beaconY.toFixed(0)})`);
  }

  private activateBeacon(player: Player): void {
    if (!this.beaconId || this.state.beaconState !== "inactive") {
      return; // Beacon not found or already activated
    }

    this.state.beaconState = "charging";
    this.state.holdoutTimer = this.BEACON_ACTIVATION_TIME;
    // this.log(`Beacon activated by player ${player.sessionId}. Starting ${this.BEACON_ACTIVATION_TIME}s holdout phase`);

    // Mark beacon as visually activated
    const beacon = this.state.interactables.get(this.beaconId);
    if (beacon) {
      beacon.isOpen = true; // Visual indicator that beacon is active
      this.state.interactables.set(this.beaconId, beacon);
    }
  }

  private spawnBoss(): void {
    if (this.state.beaconState !== "bossFight") {
      this.state.beaconState = "bossFight";
      // this.log(`Stage Guardian spawning!`);

      // For now, we'll spawn a very strong enemy as the "boss"
      // In the future, this could be a proper boss entity
      const boss = new Enemy();
      const enemyType = enemyData.charger; // Use charger as boss for now

      if (enemyType) {
        const id = uuidv4();
        boss.id = id;
        boss.typeId = "stageGuardian";

        // Give boss much higher stats than regular enemies - make it truly epic!
        const stats = enemyType.baseStats;
        boss.maxHealth = stats.maxHealth * 10; // 10x health (was 5x)
        boss.health = boss.maxHealth;
        boss.damage = stats.damage * 3; // 3x damage (was 2x)
        boss.moveSpeed = stats.moveSpeed * 1.2; // Slightly faster (was 1.5x)
        boss.isCharging = false;
        boss.chargeTargetX = 0;
        boss.chargeTargetY = 0;
        boss.telegraphTimer = 0;
        boss.chargeCooldown = 0;
        boss.attackRange = 250; // Longer attack range
        boss.projectileSpeed = 400; // Faster projectiles
        boss.projectileType = "bossProjectile";

        // Spawn boss at beacon location
        const beacon = this.state.interactables.get(this.beaconId || "");
        if (beacon) {
          boss.x = beacon.x;
          boss.y = beacon.y;
        }

        this.state.enemies.set(id, boss);
        // this.log(`Stage Guardian spawned with ${boss.maxHealth} health and ${boss.damage} damage`);
      }
    }
  }

  private completeStage(): void {
    this.state.beaconState = "stageComplete";
    // this.log(`Stage ${this.state.stageLevel} completed! Boss defeated by players.`);

    // Stop enemy spawning
    this.SPAWN_INTERVAL = 999999;

    // Clear remaining enemies after a delay
    setTimeout(() => {
      this.state.enemies.clear();
      // this.log("All enemies cleared. Stage complete - ready for progression.");
    }, 3000);

    // TODO: Add exit gates and path choices here
    // For now, just keep the stage in completed state
  }

  update = (deltaTime: number) => {
    // Removed excessive logging that was causing performance issues

    // Enemy spawning logic
    // this.log(`DEBUG Spawning: spawnTimer=${this.spawnTimer}, SPAWN_INTERVAL=${this.SPAWN_INTERVAL}, enemies.size=${this.state.enemies.size}, MAX_ENEMIES=${this.MAX_ENEMIES}`);
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.state.enemies.size < this.MAX_ENEMIES) {
      // this.log(`DEBUG Spawning: Attempting to spawn new enemy.`);
      const availableEnemyTypes = ["waspDrone", "spitter", "charger"];
      const randomEnemyTypeId = availableEnemyTypes[Math.floor(Math.random() * availableEnemyTypes.length)];
      const enemyType = enemyData[randomEnemyTypeId as keyof typeof enemyData];

      if (enemyType) {
        // this.log(`DEBUG Spawning: Selected enemy type ${randomEnemyTypeId}.`);
        const enemy = new Enemy();
        const stats = enemyType.baseStats;
        const id = uuidv4();

        enemy.id = id;
        enemy.typeId = randomEnemyTypeId;

        // Spawn enemies just off-screen relative to a player's camera
        const playersArray = Array.from(this.state.players.values());
        if (playersArray.length > 0) {
          // this.log(`DEBUG Spawning: Players present. Spawning near player.`);
          // Pick a random player to spawn near
          const randomPlayerIndex = Math.floor(Math.random() * playersArray.length);
          const player = playersArray[randomPlayerIndex];
                      // this.log(`Spawning enemy near player ${player.sessionId} at (${player.x}, ${player.y})`); // Debug player position for spawn

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
                      // this.log(`Enemy ${enemy.id} (type: ${enemy.typeId}) spawned at (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)}) near player ${player.sessionId} at (${player.x.toFixed(2)}, ${player.y.toFixed(2)}). Calculated distance: ${distance.toFixed(2)}`); // Debug enemy spawn position
        } else {
          // this.log(`DEBUG Spawning: No players present. Spawning randomly.`);
          // Fallback: if no players, spawn randomly (shouldn't happen in normal gameplay)
          enemy.x = Math.random() * this.state.worldWidth;
          enemy.y = Math.random() * this.state.worldHeight;
          // this.log(`Enemy ${enemy.id} spawned randomly at (${enemy.x}, ${enemy.y}) (no players)`);
        }

        enemy.maxHealth = stats.maxHealth;
        enemy.health = stats.health;
        enemy.damage = stats.damage;
        enemy.moveSpeed = stats.moveSpeed;
        enemy.attackCooldown = 0;
        enemy.attackRange = (enemyType as any).attackRange || 0;
        enemy.projectileType = (enemyType as any).projectileType || "";

        this.state.enemies.set(id, enemy);
        // this.log(`DEBUG Spawning: Enemy ${id} added to state. Current enemies size: ${this.state.enemies.size}`);
      }
      this.spawnTimer = 0;
    }

    // Handle beacon charging and boss spawning
    if (this.state.beaconState === "charging") {
      this.state.holdoutTimer -= deltaTime / 1000;

      if (this.state.holdoutTimer <= 0) {
        this.state.holdoutTimer = 0;
        // Spawn boss after holdout completes
        this.spawnBoss();
      }

      // Increase enemy spawn rate during holdout
      this.SPAWN_INTERVAL = 200; // Much faster spawning
    } else if (this.state.beaconState === "bossFight") {
      // Normal spawn rate during boss fight
      this.SPAWN_INTERVAL = 2000;
    } else {
      // Normal spawn rate
      this.SPAWN_INTERVAL = 2000;
    }

    // Player movement and attack
    this.state.players.forEach((player) => {
      const speed = player.calculatedMoveSpeed;
      if (player.inputX !== 0 || player.inputY !== 0) {
        player.x += player.inputX * speed;
        player.y += player.inputY * speed;

        player.x = Math.max(0, Math.min(this.state.worldWidth, player.x));
        player.y = Math.max(0, Math.min(this.state.worldHeight, player.y));
      }

      // Apply health regeneration
      if (player.health < player.calculatedMaxHealth && player.calculatedHealthRegen > 0) {
        player.health = Math.min(player.calculatedMaxHealth,
          player.health + (player.calculatedHealthRegen * deltaTime / 1000));
      }

      // Automatic attack logic (now fires projectiles)
      if (player.attackCooldown <= 0) {
        // this.log(`DEBUG Player ${player.sessionId}: Attack cooldown is ${player.attackCooldown}. Looking for enemy.`);
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
          console.log("Projectile creation logic reached!");
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
          // this.log(`DEBUG: Player projectile ${projectileId} about to be added to state. TTL: ${projectile.timeToLive.toFixed(2)}`);

          this.state.projectiles.set(projectileId, projectile);
          // this.log(`DEBUG Player projectile ${projectileId} created at (${projectile.x.toFixed(2)}, ${projectile.y.toFixed(2)}) with speed ${projectile.speed}, rotation ${projectile.rotation.toFixed(2)})`);
          player.attackCooldown = 1 / player.attackSpeed; // Reset cooldown
        } else {
          // this.log(`DEBUG Player ${player.sessionId}: Attack cooldown met, but no enemy in range.`);
        }
      } else {
        player.attackCooldown -= deltaTime / 1000; // Reduce cooldown
        // this.log(`DEBUG Player ${player.sessionId}: Attack cooldown: ${player.attackCooldown.toFixed(2)}`);
      }
    });

    // Projectile movement and collision
    const projectilesArray: Projectile[] = Array.from(this.state.projectiles.values());
    for (const projectile of projectilesArray) {
      // Update timeToLive
      projectile.timeToLive -= deltaTime / 1000;
      if (projectile.timeToLive <= 0) {
        this.state.projectiles.delete(projectile.id);
        continue; // Skip further processing for this projectile
      }
      // @ts-ignore
      projectile.x += Math.cos(projectile.rotation) * projectile.speed * (deltaTime / 1000);
      // @ts-ignore
      projectile.y += Math.sin(projectile.rotation) * projectile.speed * (deltaTime / 1000);

      // Check for collision with enemies
      for (const enemy of this.state.enemies.values()) {
        const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
        const collisionRadius = 20; // Increased collision radius for projectile and enemy

        if (distance < collisionRadius) {
          this.state.projectiles.delete(projectile.id); // Remove projectile on hit
          // Collision detected
          enemy.health -= projectile.damage; // Apply base projectile damage
          this.checkEnemyDeath(enemy);

          // Apply item effects from the player who fired the projectile
          const player = this.state.players.get(projectile.ownerId);
          if (player) {
            this.applyProjectileEffects(projectile, enemy, player);
          }
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
        // this.log(`Spitter ${enemy.id} check - Cooldown: ${enemy.attackCooldown.toFixed(2)}, Range: ${enemy.attackRange}, Distance: ${minDistance.toFixed(1)}, Can Shoot: ${enemy.attackCooldown <= 0 && minDistance <= enemy.attackRange}`);
        if (enemy.attackCooldown <= 0 && minDistance <= enemy.attackRange) {
          // this.log(`Spitter ${enemy.id} firing projectile at player ${closestPlayer.sessionId}! Distance: ${minDistance.toFixed(1)}`);
          const projectileId = uuidv4();
          const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
          // console.log(`🟢 SPITTER PROJECTILE: Created ${projectileId} with speed ${enemy.projectileSpeed} and damage ${enemy.damage}`);

          const projectile = new Projectile();
          projectile.id = projectileId;
          projectile.x = enemy.x;
          projectile.y = enemy.y;
          projectile.rotation = angle;
          projectile.speed = enemy.projectileSpeed || 400; // Use spitter's projectile speed
          projectile.damage = enemy.damage; // Use enemy's current damage
          projectile.ownerId = enemy.id;
          projectile.projectileType = "spitterProjectile"; // Explicitly set spitter projectile type
          projectile.timeToLive = 8; // Longer lifetime for better visibility and unlimited range

          this.state.projectiles.set(projectileId, projectile);
          enemy.attackCooldown = 1 / enemyTypeData.baseStats.attackSpeed; // Reset cooldown
        }
      } else if (enemyTypeData.behavior === "seekPlayer") { // Movement logic for seekPlayer enemies (WaspDrone)
        const angle = Math.atan2(closestPlayer.y - enemy.y, closestPlayer.x - enemy.x);
        const moveX = Math.cos(angle) * enemy.moveSpeed * (deltaTime / 1000);
        const moveY = Math.sin(angle) * enemy.moveSpeed * (deltaTime / 1000);

        enemy.x += moveX;
        enemy.y += moveY;

        // Clamp enemy position to world boundaries
        enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
        enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));

      } else if (enemyTypeData.behavior === "charge") { // Charger behavior
        if (!enemy.isCharging && enemy.chargeCooldown <= 0) {
          // Telegraph phase: set target and start a short cooldown
          enemy.isCharging = true;
          enemy.chargeTargetX = closestPlayer.x;
          enemy.chargeTargetY = closestPlayer.y;
          enemy.telegraphTimer = 0.5; // Telegraph duration
        } else if (enemy.isCharging && enemy.telegraphTimer > 0) {
          // Still telegraphing
          enemy.telegraphTimer -= deltaTime / 1000;
        } else if (enemy.isCharging && enemy.telegraphTimer <= 0) {
          // Charge phase: move rapidly towards target
          const angle = Math.atan2(enemy.chargeTargetY - enemy.y, enemy.chargeTargetX - enemy.x);
          const moveX = Math.cos(angle) * (enemyTypeData as any).chargeSpeed * (deltaTime / 1000);
          const moveY = Math.sin(angle) * (enemyTypeData as any).chargeSpeed * (deltaTime / 1000);

          enemy.x += moveX;
          enemy.y += moveY;

          // Force state synchronization by reassigning - this fixes the client rendering issue
          this.state.enemies.set(enemy.id, enemy);

          // Check if target reached or passed
          const distanceToTarget = Math.hypot(enemy.x - enemy.chargeTargetX, enemy.y - enemy.chargeTargetY);
          if (distanceToTarget < 10) { // Close enough to target
            enemy.isCharging = false;
            enemy.chargeCooldown = 3; // Longer cooldown after charge
          }
        }

        // Clamp enemy position to world boundaries (even during charge)
        enemy.x = Math.max(0, Math.min(this.state.worldWidth, enemy.x));
        enemy.y = Math.max(0, Math.min(this.state.worldHeight, enemy.y));
      }

      // Special behavior for Stage Guardian (boss)
      if (enemy.typeId === "stageGuardian") {
        // Boss gets rage mode as health decreases
        const healthPercent = enemy.health / enemy.maxHealth;
        if (healthPercent < 0.5) {
          // Below 50% health: boss gets faster and more aggressive
          enemy.moveSpeed = enemyTypeData.baseStats.moveSpeed * 1.8; // Much faster when raging
          enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 0.5); // Attack faster
        }

        // Boss can shoot multiple projectiles in phases
        if (healthPercent < 0.3 && Math.random() < 0.1) {
          // Below 30% health: chance to shoot triple spread shot
          // This would be implemented in the future for more complex boss patterns
        }
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
          enemy.attackCooldown = 1; // 1 second cooldown for enemy attack

          if (player.health <= 0) {
            this.state.players.delete(player.sessionId);
          }
        }
      });

      // Reduce enemy attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime / 1000;
      }
    });

    // Player-Interactable Collision and Pickup
    this.state.players.forEach((player) => {
      this.state.interactables.forEach((interactable) => {
        if (interactable.isOpen) return; // Skip already opened interactables

        const distance = Math.hypot(player.x - interactable.x, player.y - interactable.y);
        const collisionRadius = 40; // Pickup radius

        if (distance < collisionRadius) {
          // Player collided with interactable
          let generatedItem: ItemState | null = null;

          switch (interactable.type) {
            case "smallChest":
              generatedItem = this.generateRandomItem("common");
              break;
            case "largeChest":
              // Large chest: 80% uncommon, 20% rare
              generatedItem = Math.random() < 0.8
                ? this.generateRandomItem("uncommon")
                : this.generateRandomItem("rare");
              break;
            case "equipmentBarrel":
              generatedItem = this.generateRandomItem("equipment");
              break;
            case "triShop":
              // Tri-shop: generate 3 items of same rarity (weighted)
              const rarity = Math.random() < 0.7 ? "common" : "uncommon";
              // For now, just give one item (can be expanded later for choice UI)
              generatedItem = this.generateRandomItem(rarity);
              break;
            case "bioResonanceBeacon":
              // Activate the beacon!
              this.activateBeacon(player);
              // this.log(`Player ${player.sessionId} activated the Bio-Resonance Beacon!`);
              break;
          }

          if (generatedItem) {
            // Add item to player inventory
            player.items.push(generatedItem);

            // Apply item effects to player stats
            this.applyItemEffectsToPlayer(player);

            // Handle instant effects (like healing)
            generatedItem.effects.forEach((effect: ItemEffect) => {
              if (effect.stat === "healInstant") {
                player.health = Math.min(player.calculatedMaxHealth, player.health + effect.value);
              }
            });

            // Mark interactable as opened
            interactable.isOpen = true;
            this.state.interactables.set(interactable.id, interactable);
          }
        }
      });
    });
  } // This brace closes the update = (deltaTime: number) => { method

  // New helper function to apply projectile-triggered item effects
  private applyProjectileEffects(projectile: Projectile, hitEnemy: Enemy, player: Player): void {
    player.items.forEach((item: ItemState) => {
      item.effects.forEach((effect: ItemEffect) => {
        if (effect.trigger === "onAttack") {
          switch (effect.effect) {
            case "areaDamage":
              // Explosive Rounds: Apply damage in an area around the hit enemy
              this.state.enemies.forEach((aoeEnemy) => {
                const distance = Math.hypot(hitEnemy.x - aoeEnemy.x, hitEnemy.y - aoeEnemy.y);
                if (distance <= effect.radius) {
                  const aoeDamage = projectile.damage * effect.value;
                  aoeEnemy.health -= aoeDamage;
                  // this.log(`💥 Area damage hit enemy ${aoeEnemy.id} for ${aoeDamage.toFixed(2)} damage from ${item.name}`);
                  this.checkEnemyDeath(aoeEnemy);
                }
              });
              break;
            case "chainDamage":
              // Lightning Rod: Chain damage to additional targets
              if (Math.random() < (effect.chance || 0)) { // Check for chance to proc
                // this.log(`⚡ Chain damage proc from ${item.name}!`);
                let chainedTargets: Enemy[] = [hitEnemy];
                let lastChainedEnemy: Enemy = hitEnemy; // Start with the enemy that was hit

                for (let i = 0; i < effect.targets; i++) {
                  let nearestUnchainedEnemy: Enemy | null = null;
                  let minDistance = Infinity;

                  this.state.enemies.forEach((chainCandidate: Enemy) => {
                    if (!chainedTargets.includes(chainCandidate)) {
                      const distance = Math.hypot(lastChainedEnemy.x - chainCandidate.x, lastChainedEnemy.y - chainCandidate.y);
                      if (distance < minDistance) {
                        minDistance = distance;
                        nearestUnchainedEnemy = chainCandidate;
                      }
                    }
                  });

                  if (nearestUnchainedEnemy) {
                    const chainedEnemy = nearestUnchainedEnemy as Enemy; // Explicit type assertion
                    const chainDamage = projectile.damage * effect.value * (1 - (i * (effect.value || 0))); // Apply reduction per chain
                    chainedEnemy.health -= chainDamage;
                    // this.log(`⚡ Chain hit enemy ${chainedEnemy.id} for ${chainDamage.toFixed(2)} damage from ${item.name}`);
                    this.checkEnemyDeath(chainedEnemy);
                    chainedTargets.push(chainedEnemy);
                    lastChainedEnemy = chainedEnemy; // Update the source for the next chain
                  } else {
                    break; // No more enemies to chain to
                  }
                }
              }
              break;
            case "applyBurn":
              // Inferno Orb: Apply burn status effect
              // this.log(`🔥 Applying burn to enemy ${hitEnemy.id} from ${item.name}. (Placeholder: Status effect system needed)`);
              // TODO: Implement a proper status effect system for enemies
              break;
            case "applyChill":
              // Frost Shard: Apply chill status effect
              // this.log(`❄️ Applying chill to enemy ${hitEnemy.id} from ${item.name}. (Placeholder: Status effect system needed)`);
              // TODO: Implement a proper status effect system for enemies
              break;
          }
        }
      });
    });
  }

  onJoin(client: Client, options: any) {
    // this.log(client.sessionId, "joined!");
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

    // Initialize calculated stats (same as base stats initially)
    player.calculatedMaxHealth = stats.maxHealth;
    player.calculatedHealthRegen = stats.healthRegen;
    player.calculatedDamage = stats.damage;
    player.calculatedAttackSpeed = stats.attackSpeed;
    player.calculatedProjectileSpeed = stats.projectileSpeed;
    player.calculatedMoveSpeed = stats.moveSpeed;
    player.calculatedArmor = stats.armor;
    player.calculatedCritChance = stats.critChance;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    // this.log("room", this.roomId, client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    // this.log("room", this.roomId, "disposing...");
  }

  // Equipment ability methods
  private executeDashAttack(player: Player, damage: number): void {
    // console.log(`⚡ Dash attack activated by ${player.sessionId} for ${damage} damage`);

    // Find all enemies near the player and damage them
    const dashRadius = 100;
    this.state.enemies.forEach((enemy) => {
      const distance = Math.sqrt(
        Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
      );

      if (distance <= dashRadius) {
        enemy.health -= damage;
        // console.log(`⚡ Dash hit enemy ${enemy.id} for ${damage} damage`);
        this.checkEnemyDeath(enemy);
      }
    });
  }

  private throwGrenade(player: Player, damage: number, radius: number): void {
    // console.log(`💣 Grenade thrown by ${player.sessionId} for ${damage} damage in ${radius} radius`);

    // Find all enemies in the grenade radius
    this.state.enemies.forEach((enemy) => {
      const distance = Math.sqrt(
        Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
      );

      if (distance <= radius) {
        enemy.health -= damage;
        // console.log(`💣 Grenade hit enemy ${enemy.id} for ${damage} damage`);
        this.checkEnemyDeath(enemy);
      }
    });
  }

  private checkEnemyDeath(enemy: Enemy): void {
    if (enemy.health <= 0) {
      // Check if this was the boss (stage guardian)
      if (enemy.typeId === "stageGuardian" && this.state.beaconState === "bossFight") {
        this.completeStage();
      }
      this.state.enemies.delete(enemy.id);
    }
  }
}
