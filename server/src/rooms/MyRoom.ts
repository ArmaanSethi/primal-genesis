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

  // Time-based difficulty system
  private readonly DIFFICULTY_INTERVAL: number = 60; // 60 seconds per difficulty level
  private lastDifficultyIncrease: number = 0;

  // Enemy defeat tracking for beacon spawning
  private enemiesDefeated: number = 0;
  private readonly BEACON_SPAWN_THRESHOLD: number = 3; // Spawn beacon after 3 enemies defeated (reduced for testing)
  private beaconSpawned: boolean = false;

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

    // Handle player dash ability
    this.onMessage("dash", (client, data: { directionX: number, directionY: number, duration: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead) {
        console.log(`💨 Player ${client.sessionId} performed dash in direction (${data.directionX.toFixed(2)}, ${data.directionY.toFixed(2)})`);

        // Calculate dash distance (fixed distance for balance)
        const dashDistance = 150; // pixels
        const targetX = player.x + (data.directionX * dashDistance);
        const targetY = player.y + (data.directionY * dashDistance);

        // Clamp to world boundaries
        player.x = Math.max(20, Math.min(this.state.worldWidth - 20, targetX));
        player.y = Math.max(20, Math.min(this.state.worldHeight - 20, targetY));

        // Make player invincible during dash
        player.isDashing = true;
        player.dashEndTime = Date.now() + data.duration;

        console.log(`💨 Dash completed - Player position: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`);
      }
    });

    // Handle player interactions (chests, beacons, altars, totems)
    this.onMessage("interact", (client, data: { interactableId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      console.log(`🎮 Player ${client.sessionId} attempting to interact`);

      // Handle undefined data (some tests call interact without parameters)
      if (!data) {
        console.log(`📦 Player ${client.sessionId} interacted without data - attempting item pickup`);
        this.handleItemPickup(player);
        return;
      }

      if (data.interactableId) {
        // Specific interactable interaction (beacon, chest, altar, totem)
        const interactable = this.state.interactables.get(data.interactableId);
        if (interactable) {
          const distance = Math.hypot(interactable.x - player.x, interactable.y - player.y);

          if (distance < 50) { // Interaction range
            this.handleInteractableInteraction(player, interactable, data.interactableId);
          } else {
            console.log(`📏 Player ${client.sessionId} too far from interactable (${distance.toFixed(1)}px)`);
          }
        }
      } else {
        // General interaction (pickup nearby items)
        this.handleItemPickup(player);
      }
    });
  }

  private noop = (...args: any[]) => {};
  private log = console.log;

  // Interaction Helper Methods
  private handleInteractableInteraction(player: Player, interactable: InteractableState, interactableId: string): void {
    console.log(`🎯 Player ${player.sessionId} interacting with ${interactable.type} (${interactableId})`);

    switch (interactable.type) {
      case "bioResonanceBeacon":
        this.handleBeaconActivation(player, interactable, interactableId);
        break;

      case "smallChest":
      case "largeChest":
        this.handleChestOpening(player, interactable, interactableId);
        break;

      case "altarOfTheApex":
        this.handleAltarInteraction(player, interactable, interactableId);
        break;

      case "whisperingTotem":
        this.handleTotemInteraction(player, interactable, interactableId);
        break;

      default:
        console.log(`❓ Unknown interactable type: ${interactable.type}`);
    }
  }

  private handleItemPickup(player: Player): void {
    // Find nearby interactables (chests, items on ground)
    let pickedUpItem = false;

    for (const [interactableId, interactable] of this.state.interactables.entries()) {
      if (interactable.isOpen) continue; // Skip already opened interactables

      const distance = Math.hypot(interactable.x - player.x, interactable.y - player.y);
      if (distance < 40) { // Pickup range
        console.log(`📦 Player ${player.sessionId} picking up ${interactable.type}`);

        switch (interactable.type) {
          case "smallChest":
          case "largeChest":
            this.handleChestOpening(player, interactable, interactableId);
            pickedUpItem = true;
            break;
        }

        if (pickedUpItem) break; // Only pick up one item per interaction
      }
    }
  }

  private handleBeaconActivation(player: Player, beacon: InteractableState, beaconId: string): void {
    if (beacon.isOpen) {
      console.log(`🚫 Beacon ${beaconId} already activated`);
      return;
    }

    console.log(`🌟 BEACON ACTIVATED by player ${player.sessionId}!`);
    beacon.isOpen = true;
    this.state.beaconState = "charging";
    this.state.holdoutTimer = 30; // 30 second holdout phase

    // Start boss spawn countdown
    setTimeout(() => {
      this.spawnBoss();
      this.state.beaconState = "bossFight";
    }, 30000); // 30 seconds
  }

  private handleChestOpening(player: Player, chest: InteractableState, chestId: string): void {
    if (chest.isOpen) {
      console.log(`📦 Chest ${chestId} already opened`);
      return;
    }

    chest.isOpen = true;
    console.log(`📦 Player ${player.sessionId} opened ${chest.type}`);

    // Generate items based on chest type
    const itemCount = chest.type === "largeChest" ? 3 : 1;
    const rarity = chest.type === "largeChest" ? "rare" : "uncommon";

    for (let i = 0; i < itemCount; i++) {
      const item = this.generateRandomItem(rarity);
      if (item) {
        player.items.push(item);
        console.log(`💎 Player ${player.sessionId} received item: ${item.name} (${item.rarity})`);
      }
    }
  }

  private handleAltarInteraction(player: Player, altar: InteractableState, altarId: string): void {
    if (altar.isOpen) {
      console.log(`🗿 Altar ${altarId} already used`);
      return;
    }

    console.log(`🗿 Player ${player.sessionId} activating Altar of the Apex`);

    // Check if player can afford the cost
    const totalStats = player.calculatedMaxHealth + player.calculatedDamage + player.calculatedMoveSpeed;

    if (totalStats >= 100) {
      altar.isOpen = true;

      // Give player a random rare or legendary item
      const item = this.generateRandomItem(Math.random() < 0.7 ? "rare" : "legendary");
      if (item) {
        player.items.push(item);
        console.log(`✨ Altar granted ${item.name} to player ${player.sessionId}`);
      }
    } else {
      console.log(`💔 Player ${player.sessionId} lacks sufficient stats for Altar (${totalStats}/100)`);
    }
  }

  private handleTotemInteraction(player: Player, totem: InteractableState, totemId: string): void {
    if (totem.isOpen) {
      console.log(`✨ Totem ${totemId} already used`);
      return;
    }

    console.log(`✨ Player ${player.sessionId} activating Whispering Totem`);

    // Whispering Totem: Costs 50% health, 10% chance to fail
    const healthCost = Math.floor(player.calculatedMaxHealth * 0.5);
    if (player.health > healthCost) {
      player.health -= healthCost;

      // 10% chance to fail
      if (Math.random() < 0.1) {
        console.log(`💀 Whispering Totem failed for player ${player.sessionId}! Lost health for nothing.`);
      } else {
        const generatedItem = this.generateRandomItem("rare"); // Guaranteed rare item
        if (generatedItem) {
          player.items.push(generatedItem);
          console.log(`✨ Whispering Totem blessed player ${player.sessionId} with a rare item!`);
        }
      }
    } else {
      console.log(`💔 Player ${player.sessionId} lacks health to activate Whispering Totem`);
    }
  }

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
      { type: "triShop", cost: 20, weight: 10 },
      { type: "whisperingTotem", cost: 5, weight: 15 }, // Low cost, higher weight than tri-shop
      { type: "altarOfTheApex", cost: 0, weight: 2 } // Very rare, free but high risk/reward
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
          } else if (selectedInteractable.type === "whisperingTotem") {
            // Whispering Totem costs 50% of player's max health - will be calculated on interaction
            interactableState.creditCost = 50; // Will be interpreted as percentage
          } else if (selectedInteractable.type === "altarOfTheApex") {
            // Altar should spawn near beacon, will be positioned later when beacon spawns
            continue; // Skip regular positioning for altar
          }

          this.state.interactables.set(interactableState.id, interactableState);
          remainingCredits -= selectedInteractable.cost;
        }
      }

      attempts++;
    }

    // Note: Beacon will now spawn after defeating BEACON_SPAWN_THRESHOLD enemies
    // instead of spawning immediately at level start
    console.log(`🎯 Beacon will spawn after defeating ${this.BEACON_SPAWN_THRESHOLD} enemies`);
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

        // Clamp to world bounds with larger safe margins for visibility
        const beaconSafeMargin = 300; // Keep beacon away from edges
        beaconX = Math.max(beaconSafeMargin, Math.min(this.state.worldWidth - beaconSafeMargin, beaconX));
        beaconY = Math.max(beaconSafeMargin, Math.min(this.state.worldHeight - beaconSafeMargin, beaconY));
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

    // Spawn Altar of the Apex near the beacon
    this.spawnAltarOfTheApex(beaconX, beaconY);
  }

  private spawnAltarOfTheApex(beaconX: number, beaconY: number): void {
    // Spawn altar within 100-200 units of the beacon
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 100; // 100-200 units away
    const altarX = beaconX + Math.cos(angle) * distance;
    const altarY = beaconY + Math.sin(angle) * distance;

    // Ensure altar is within world bounds
    const finalX = Math.max(50, Math.min(this.state.worldWidth - 50, altarX));
    const finalY = Math.max(50, Math.min(this.state.worldHeight - 50, altarY));

    const altar = new InteractableState();
    altar.id = uuidv4();
    altar.type = "altarOfTheApex";
    altar.x = finalX;
    altar.y = finalY;
    altar.isOpen = false;

    this.state.interactables.set(altar.id, altar);
    console.log(`🗿 Altar of the Apex spawned near beacon at (${finalX.toFixed(0)}, ${finalY.toFixed(0)})`);
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
    if (this.state.beaconState !== "bossFight" && this.state.beaconState !== "apexEmpowered") {
      const wasApexEmpowered = this.state.beaconState === "apexEmpowered";
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
        let healthMultiplier = 10;
        let damageMultiplier = 3;

        // If Apex Altar was activated, empower the boss (+50% HP, +25% Damage)
        if (wasApexEmpowered) {
          healthMultiplier *= 1.5; // 15x health instead of 10x
          damageMultiplier *= 1.25; // 3.75x damage instead of 3x
          console.log(`🗿 Apex Empowered Boss spawning! Stats increased by 50% HP and 25% damage!`);
        }

        boss.maxHealth = stats.maxHealth * healthMultiplier;
        boss.health = boss.maxHealth;
        boss.damage = stats.damage * damageMultiplier;
        boss.moveSpeed = stats.moveSpeed * 1.2; // Slightly faster (was 1.5x)
        boss.isCharging = false;
        boss.chargeTargetX = 0;
        boss.chargeTargetY = 0;
        boss.telegraphTimer = 0;
        boss.chargeCooldown = 0;
        boss.attackRange = 250; // Longer attack range
        boss.projectileSpeed = 400; // Faster projectiles
        boss.projectileType = "bossProjectile";

        // Spawn boss at safe location near beacon (away from edges)
        const beacon = this.state.interactables.get(this.beaconId || "");
        if (beacon) {
          // Calculate safe spawn zone to ensure boss is visible
          const safeMargin = 500; // Boss should be at least 500px from edges
          const worldBounds = {
            minX: safeMargin,
            maxX: this.state.worldWidth - safeMargin,
            minY: safeMargin,
            maxY: this.state.worldHeight - safeMargin
          };

          // Start with beacon position
          let spawnX = beacon.x;
          let spawnY = beacon.y;

          // Adjust position if too close to edges
          if (spawnX < worldBounds.minX) spawnX = worldBounds.minX;
          if (spawnX > worldBounds.maxX) spawnX = worldBounds.maxX;
          if (spawnY < worldBounds.minY) spawnY = worldBounds.minY;
          if (spawnY > worldBounds.maxY) spawnY = worldBounds.maxY;

          // Add some randomization within safe zone to make spawn less predictable
          spawnX += (Math.random() - 0.5) * 200; // ±100px variation
          spawnY += (Math.random() - 0.5) * 200; // ±100px variation

          // Ensure final position is still within bounds
          spawnX = Math.max(worldBounds.minX, Math.min(worldBounds.maxX, spawnX));
          spawnY = Math.max(worldBounds.minY, Math.min(worldBounds.maxY, spawnY));

          boss.x = spawnX;
          boss.y = spawnY;

          this.log(`Boss spawned at safe location: (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
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

        // Apply difficulty scaling to enemy stats
        const difficultyLevel = Math.floor(this.state.timeElapsed / this.DIFFICULTY_INTERVAL);
        const healthMultiplier = 1 + (difficultyLevel * 0.25);
        const damageMultiplier = 1 + (difficultyLevel * 0.20);
        const speedMultiplier = 1 + (difficultyLevel * 0.10);

        // Check if this should be an Elite enemy
        const eliteChance = Math.min(difficultyLevel * 0.05, 0.25); // Up to 25% elite chance
        const isElite = Math.random() < eliteChance;

        let finalHealthMultiplier = healthMultiplier;
        let finalDamageMultiplier = damageMultiplier;
        let eliteModifier = "";

        if (isElite) {
          // Apply elite bonuses
          finalHealthMultiplier *= 1.5; // Elite enemies have 50% more health
          finalDamageMultiplier *= 1.3; // Elite enemies have 30% more damage

          // Randomly assign elite modifier
          const eliteModifiers = ["glacial", "overloading", "venomous", "swift"];
          eliteModifier = eliteModifiers[Math.floor(Math.random() * eliteModifiers.length)];

          console.log(`👹 ELITE ENEMY SPAWNED: ${enemy.typeId} with ${eliteModifier} modifier!`);
        }

        enemy.maxHealth = Math.floor(stats.maxHealth * finalHealthMultiplier);
        enemy.health = enemy.maxHealth;
        enemy.damage = Math.floor(stats.damage * finalDamageMultiplier);
        enemy.moveSpeed = stats.moveSpeed * speedMultiplier;

        // Store elite information for client rendering
        (enemy as any).isElite = isElite;
        (enemy as any).eliteModifier = eliteModifier;
        enemy.attackCooldown = 0;
        enemy.attackRange = (enemyType as any).attackRange || 0;
        enemy.projectileType = (enemyType as any).projectileType || "";

        console.log(`👾 Spawned ${enemy.typeId} with scaled stats: HP=${enemy.maxHealth}, DMG=${enemy.damage}, SPD=${enemy.moveSpeed.toFixed(1)}`);

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

    // Update time-based difficulty scaling
    this.updateDifficultyScaling(deltaTime);

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

      // Collect XP entities with magnet effect
      const magnetRadius = 120; // Magnet attraction radius
      const pickupRadius = 40; // Actual pickup radius (smaller for precision)
      this.state.xpEntities.forEach((xpEntity, xpId) => {
        const distance = Math.hypot(player.x - xpEntity.x, player.y - xpEntity.y);

        // Apply magnet effect when within range
        if (distance <= magnetRadius && distance > 0) {
          // Calculate attraction force (stronger when closer)
          const attractionForce = Math.max(0.1, 1 - (distance / magnetRadius));
          const moveSpeed = attractionForce * 300 * (deltaTime / 1000);

          // Move XP entity towards player
          const angle = Math.atan2(player.y - xpEntity.y, player.x - xpEntity.x);
          const moveX = Math.cos(angle) * moveSpeed;
          const moveY = Math.sin(angle) * moveSpeed;

          xpEntity.x += moveX;
          xpEntity.y += moveY;
        }

        // Collect when close enough
        if (distance <= pickupRadius) {
          // Award XP to player
          player.xp += xpEntity.xpValue;
          console.log(`✨ Player ${player.sessionId} collected ${xpEntity.xpValue} XP! Total XP: ${player.xp}`);

          // Check for level up
          this.checkPlayerLevelUp(player);

          // Remove XP entity
          this.state.xpEntities.delete(xpId);
        }
      });

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
          // Check if player is dashing (invincible during dash)
          const isPlayerDashing = player.isDashing && Date.now() < player.dashEndTime;

          if (!isPlayerDashing) {
            player.health -= enemy.damage;
            enemy.attackCooldown = 1; // 1 second cooldown for enemy attack

            if (player.health <= 0) {
              this.state.players.delete(player.sessionId);
            }
          } else {
            console.log(`💨 Player ${player.sessionId} avoided damage through dash invincibility!`);
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
      this.state.interactables.forEach((interactable, interactableId) => {
        if (interactable.isOpen) return; // Skip already opened interactables

        const distance = Math.hypot(player.x - interactable.x, player.y - interactable.y);
        const collisionRadius = 40; // Pickup radius

        if (distance < collisionRadius) {
          // Player collided with interactable - log the pickup attempt
          console.log(`📦 Player ${player.sessionId} picking up ${interactable.type} at (${interactable.x.toFixed(1)}, ${interactable.y.toFixed(1)})`);

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
            case "whisperingTotem":
              // Whispering Totem: Costs 50% health, 10% chance to fail
              const healthCost = Math.floor(player.calculatedMaxHealth * 0.5);
              if (player.health > healthCost) {
                player.health -= healthCost;

                // 10% chance to fail
                if (Math.random() < 0.1) {
                  console.log(`💀 Whispering Totem failed for player ${player.sessionId}! Lost health for nothing.`);
                } else {
                  generatedItem = this.generateRandomItem("rare"); // Guaranteed rare item
                  console.log(`✨ Whispering Totem blessed player ${player.sessionId} with a rare item!`);
                }
              } else {
                console.log(`💔 Player ${player.sessionId} lacks health to activate Whispering Totem`);
              }
              break;
            case "altarOfTheApex":
              // Altar of the Apex: Empowers boss for guaranteed rare drop
              console.log(`🗿 Player ${player.sessionId} activated the Altar of the Apex! Boss will be empowered...`);

              // Set flag to empower boss on next spawn and guarantee rare drop
              this.state.beaconState = "apexEmpowered";
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
            console.log(`✨ Player ${player.sessionId} received item: ${generatedItem.name} (${generatedItem.rarity})`);

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
            this.state.interactables.set(interactableId, interactable);
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

  onJoin(client: Client, _options: any) {
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

  onLeave(client: Client, _consented: boolean) {
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
      // Spawn XP for regular enemies
      const isElite = (enemy as any).isElite || false;
      this.spawnEnemyXP(enemy.x, enemy.y, enemy.typeId, isElite);

      // Track enemy defeats for beacon spawning (skip the boss)
      if (enemy.typeId !== "stageGuardian") {
        this.enemiesDefeated++;
        console.log(`⚔️ Enemy defeated! Total enemies defeated: ${this.enemiesDefeated}/${this.BEACON_SPAWN_THRESHOLD}`);

        // Check if we should spawn the beacon
        if (!this.beaconSpawned && this.enemiesDefeated >= this.BEACON_SPAWN_THRESHOLD) {
          console.log(`🌟 BEACON SPAWN TRIGGERED! Defeated ${this.enemiesDefeated} enemies.`);
          this.spawnBeacon();
          this.beaconSpawned = true;
        }
      }

      // Check if this was the boss (stage guardian)
      if (enemy.typeId === "stageGuardian") {
        // Spawn boss rewards
        this.spawnBossRewards(enemy.x, enemy.y);
        this.completeStage();
      }
      this.state.enemies.delete(enemy.id);
    }
  }

  private spawnEnemyXP(x: number, y: number, enemyType: string, isElite: boolean = false): void {
    const xpEntity = new XPEntityState();
    xpEntity.id = uuidv4();
    xpEntity.x = x;
    xpEntity.y = y;

    let baseXP = 10;
    switch (enemyType) {
      case "waspDrone":
        baseXP = 10; // Basic enemy
        break;
      case "spitter":
        baseXP = 15; // Ranged enemy
        break;
      case "charger":
        baseXP = 20; // Melee enemy
        break;
      default:
        baseXP = 10; // Default XP
        break;
    }

    // Check if this was an elite enemy and award bonus XP
    if (isElite) {
      baseXP = Math.floor(baseXP * 2); // Elite enemies give 2x XP
      console.log(`👹 Elite enemy defeated! Bonus XP awarded.`);
    }

    xpEntity.xpValue = baseXP;

    this.state.xpEntities.set(xpEntity.id, xpEntity);
    console.log(`💀 Enemy defeated! Spawned ${xpEntity.xpValue} XP at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }

  private spawnBossRewards(bossX: number, bossY: number): void {
    // Check if Apex Altar was used to empower this boss
    const wasApexEmpowered = this.state.beaconState === "bossFight" || this.state.beaconState === "stageComplete";

    // Always spawn at least one rare item
    const rareItem = this.generateRandomItem("rare");
    if (rareItem) {
      const xpEntity = new XPEntityState();
      xpEntity.id = uuidv4();
      xpEntity.x = bossX;
      xpEntity.y = bossY;
      xpEntity.xpValue = 100; // Boss XP value

      this.state.xpEntities.set(xpEntity.id, xpEntity);

      console.log(`🎁 Boss defeated! Spawned rare item: ${rareItem.name} and ${xpEntity.xpValue} XP`);
    }

    // If Apex Altar was used, guarantee additional rewards
    if (wasApexEmpowered) {
      // Spawn a second guaranteed rare item
      const secondRareItem = this.generateRandomItem("rare");

      // Create additional XP reward
      const bonusXp = new XPEntityState();
      bonusXp.id = uuidv4();
      bonusXp.x = bossX + 30;
      bonusXp.y = bossY + 30;
      bonusXp.xpValue = 50;

      this.state.xpEntities.set(bonusXp.id, bonusXp);

      if (secondRareItem) {
        console.log(`🗿 Apex Boss defeated! Bonus rewards: ${secondRareItem.name} and extra ${bonusXp.xpValue} XP`);
      }
    }
  }

  private checkPlayerLevelUp(player: Player): void {
    // Calculate XP needed for next level (exponential scaling)
    const xpForNextLevel = Math.floor(100 * Math.pow(1.2, player.level));

    if (player.xp >= xpForNextLevel) {
      player.level++;
      player.xp -= xpForNextLevel; // Carry over excess XP

      // Apply level-up bonuses (small stat increases as per GDD.md)
      const healthBonus = 5; // Small health increase
      const damageBonus = 1; // Small damage increase

      player.maxHealth += healthBonus;
      player.calculatedMaxHealth += healthBonus;
      player.health += healthBonus; // Heal on level up
      player.damage += damageBonus;
      player.calculatedDamage += damageBonus;

      console.log(`🎉 Player ${player.sessionId} reached level ${player.level}!`);
      console.log(`   +${healthBonus} max health, +${damageBonus} damage`);
      console.log(`   Next level requires ${Math.floor(100 * Math.pow(1.2, player.level))} XP`);
    }
  }

  private updateDifficultyScaling(deltaTime: number): void {
    // Update game time
    this.state.timeElapsed += deltaTime / 1000; // Convert to seconds

    // Calculate current difficulty level based on time elapsed
    const difficultyLevel = Math.floor(this.state.timeElapsed / this.DIFFICULTY_INTERVAL);

    // Define difficulty levels as per GDD.md
    const difficultyLevels = ["Easy", "Medium", "Hard", "Very Hard", "INSANE"];
    const currentDifficulty = difficultyLevels[Math.min(difficultyLevel, difficultyLevels.length - 1)];

    // Update difficulty state if it changed
    if (this.state.difficultyLevel !== currentDifficulty) {
      const previousDifficulty = this.state.difficultyLevel;
      this.state.difficultyLevel = currentDifficulty;

      console.log(`⚠️ DIFFICULTY INCREASED: ${previousDifficulty} → ${currentDifficulty} (${this.state.timeElapsed.toFixed(0)}s)`);

      // Apply difficulty scaling
      this.applyDifficultyScaling(difficultyLevel);
    }
  }

  private applyDifficultyScaling(difficultyLevel: number): void {
    // Base scaling factors (increases with each difficulty level)
    const healthMultiplier = 1 + (difficultyLevel * 0.25); // +25% health per level
    const damageMultiplier = 1 + (difficultyLevel * 0.20); // +20% damage per level
    const speedMultiplier = 1 + (difficultyLevel * 0.10); // +10% speed per level
    const spawnRateMultiplier = 1 + (difficultyLevel * 0.15); // +15% spawn rate per level

    // Update enemy spawn parameters
    this.MAX_ENEMIES = Math.min(50 + (difficultyLevel * 10), 100); // More enemies at higher difficulties
    this.SPAWN_INTERVAL = Math.max(2000 / spawnRateMultiplier, 500); // Faster spawning using multiplier

    // Apply scaling to existing enemies (optional - affects new spawns only)
    console.log(`📊 Difficulty ${difficultyLevel} scaling applied:`);
    console.log(`   Enemy health: x${healthMultiplier.toFixed(2)}`);
    console.log(`   Enemy damage: x${damageMultiplier.toFixed(2)}`);
    console.log(`   Enemy speed: x${speedMultiplier.toFixed(2)}`);
    console.log(`   Max enemies: ${this.MAX_ENEMIES}`);
    console.log(`   Spawn interval: ${this.SPAWN_INTERVAL}ms`);

    // Increase Elite enemy chance at higher difficulties
    // (Will be implemented when Elite Enemies are added)
    const eliteChance = Math.min(difficultyLevel * 0.05, 0.25); // Up to 25% elite chance
    console.log(`   Elite chance: ${(eliteChance * 100).toFixed(0)}%`);
  }
}
