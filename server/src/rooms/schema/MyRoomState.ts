import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class ItemEffect extends Schema {
  @type("string") stat: string = "";
  @type("number") value: number = 0;
  @type("string") type: string = ""; // "flat" or "percentage"
  @type("string") trigger: string = ""; // "onTimer", "onAttack", "onDamage", "onActivate"
  @type("string") effect: string = ""; // specific effect name
  @type("number") interval: number = 0; // for timer-based effects
  @type("number") targets: number = 0; // for multi-target effects
  @type("number") radius: number = 0; // for area effects
  @type("number") cooldown: number = 0; // for equipment cooldown
  @type("number") chance: number = 0; // for proc chance effects
  @type("string") damageType: string = ""; // for elemental damage types (e.g., "fire", "ice")
}

export class ItemState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") description: string = "";
  @type("string") icon: string = "";
  @type("string") rarity: string = ""; // "common", "uncommon", "rare", "equipment"
  @type("string") stackingType: string = ""; // "linear", "diminishing", "special", "none"
  @type([ItemEffect]) effects = new ArraySchema<ItemEffect>();
}

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("number") x: number = Math.floor(Math.random() * 800);
  @type("number") y: number = Math.floor(Math.random() * 600);

  // Base stats (from character data)
  @type("number") maxHealth: number = 100;
  @type("number") health: number = 100;
  @type("number") healthRegen: number = 1;
  @type("number") damage: number = 10;
  @type("number") attackSpeed: number = 1;
  @type("number") projectileSpeed: number = 500; // Pixels per second
  @type("number") moveSpeed: number = 4;
  @type("number") armor: number = 0;
  @type("number") critChance: number = 0.05;
  @type("number") attackCooldown: number = 0;

  // Calculated stats (base + item bonuses)
  @type("number") calculatedMaxHealth: number = 100;
  @type("number") calculatedHealthRegen: number = 1;
  @type("number") calculatedDamage: number = 10;
  @type("number") calculatedAttackSpeed: number = 1;
  @type("number") calculatedProjectileSpeed: number = 500;
  @type("number") calculatedMoveSpeed: number = 4;
  @type("number") calculatedArmor: number = 0;
  @type("number") calculatedCritChance: number = 0.05;

  // Player inventory
  @type([ItemState]) items = new ArraySchema<ItemState>();
  @type("number") xp: number = 0;
  @type("number") level: number = 1;

  // Input buffer for server-side processing
  inputX: number = 0;
  inputY: number = 0;

  // Combat and state flags
  @type("boolean") isDead: boolean = false;
  @type("boolean") isDashing: boolean = false;
  @type("number") dashEndTime: number = 0;
}

export class Enemy extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") typeId: string = "";

  @type("number") health: number = 1;
  @type("number") maxHealth: number = 1;
  @type("number") damage: number = 1;
  @type("number") moveSpeed: number = 1;
  @type("number") attackCooldown: number = 0;
  @type("number") attackRange: number = 0;
  @type("number") projectileSpeed: number = 0;
  @type("string") projectileType: string = "";
  @type("number") chargeCooldown: number = 0;
  @type("number") chargeSpeed: number = 0;
  @type("boolean") isCharging: boolean = false;
  @type("number") chargeTargetX: number = 0;
  @type("number") chargeTargetY: number = 0;
  @type("number") telegraphTimer: number = 0; // Timer for the telegraph phase of Charger

  // New enemy type specific fields
  @type("boolean") isExploding: boolean = false; // For Exploder enemies
  @type("number") explosionTimer: number = 0; // Timer for explosion delay
  @type("boolean") shieldActive: boolean = true; // For Shield enemies
  @type("number") shieldCooldownTimer: number = 0; // Cooldown for shield regeneration
  @type("number") swarmCount: number = 1; // For Swarm enemy grouping logic

  // Status Effects System
  @type("boolean") isPoisoned: boolean = false; // Poison status effect
  @type("number") poisonDamage: number = 0; // Poison damage per second
  @type("number") poisonDuration: number = 0; // Poison remaining duration
  @type("number") poisonStacks: number = 0; // Number of poison stacks

  @type("boolean") isBurning: boolean = false; // Fire status effect
  @type("number") burnDamage: number = 0; // Burn damage per second
  @type("number") burnDuration: number = 0; // Burn remaining duration

  @type("boolean") isChilled: boolean = false; // Chill status effect
  @type("number") chillSlowdown: number = 0; // Movement speed reduction
  @type("number") chillDuration: number = 0; // Chill remaining duration

  @type("boolean") isVulnerable: boolean = false; // Vulnerability status effect
  @type("number") vulnerabilityMultiplier: number = 1; // Damage taken multiplier
  @type("number") vulnerabilityDuration: number = 0; // Vulnerability remaining duration

  @type("boolean") isElite: boolean = false; // Elite enemy flag
  @type("string") eliteColor: string = ""; // Elite enemy color
}

export class Projectile extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("number") speed: number = 0;
  @type("number") damage: number = 0;
  @type("string") ownerId: string = "";
  @type("string") projectileType: string = "";
  @type("number") timeToLive: number = 0; // Time in seconds before projectile despawns
}

export class InteractableState extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = ""; // "smallChest", "largeChest", "equipmentBarrel", etc.
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") isOpen: boolean = false;
  @type("string") itemRarity: string = ""; // for chests that guarantee specific rarity
  @type("number") creditCost: number = 0; // for paid interactables
  @type("number") choiceCount: number = 1; // for tri-shops
}

export class XPEntityState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") xpValue: number = 10;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: InteractableState }) interactables = new MapSchema<InteractableState>();
  @type({ map: XPEntityState }) xpEntities = new MapSchema<XPEntityState>();

  @type("number") worldWidth: number = 8000;
  @type("number") worldHeight: number = 6000;

  // Game state
  @type("number") timeElapsed: number = 0;
  @type("string") difficultyLevel: string = "Easy";
  @type("string") beaconState: string = "inactive"; // "inactive", "charging", "bossFight", "stageComplete"
  @type("number") holdoutTimer: number = 0;
  @type("number") stageLevel: number = 1;
}
