"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoomState = exports.XPEntityState = exports.InteractableState = exports.Projectile = exports.Enemy = exports.Player = exports.ItemState = exports.ItemEffect = void 0;
const schema_1 = require("@colyseus/schema");
class ItemEffect extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.stat = "";
        this.value = 0;
        this.type = ""; // "flat" or "percentage"
        this.trigger = ""; // "onTimer", "onAttack", "onDamage", "onActivate"
        this.effect = ""; // specific effect name
        this.interval = 0; // for timer-based effects
        this.targets = 0; // for multi-target effects
        this.radius = 0; // for area effects
        this.cooldown = 0; // for equipment cooldown
        this.chance = 0; // for proc chance effects
        this.damageType = ""; // for elemental damage types (e.g., "fire", "ice")
    }
}
exports.ItemEffect = ItemEffect;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemEffect.prototype, "stat", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "value", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemEffect.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemEffect.prototype, "trigger", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemEffect.prototype, "effect", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "interval", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "targets", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "radius", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "cooldown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ItemEffect.prototype, "chance", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemEffect.prototype, "damageType", void 0);
class ItemState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.description = "";
        this.icon = "";
        this.rarity = ""; // "common", "uncommon", "rare", "equipment"
        this.stackingType = ""; // "linear", "diminishing", "special", "none"
        this.effects = new schema_1.ArraySchema();
    }
}
exports.ItemState = ItemState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "description", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "icon", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "rarity", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ItemState.prototype, "stackingType", void 0);
__decorate([
    (0, schema_1.type)([ItemEffect]),
    __metadata("design:type", Object)
], ItemState.prototype, "effects", void 0);
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        this.x = Math.floor(Math.random() * 800);
        this.y = Math.floor(Math.random() * 600);
        // Base stats (from character data)
        this.maxHealth = 100;
        this.health = 100;
        this.healthRegen = 1;
        this.damage = 10;
        this.attackSpeed = 1;
        this.projectileSpeed = 500; // Pixels per second
        this.moveSpeed = 4;
        this.armor = 0;
        this.critChance = 0.05;
        this.attackCooldown = 0;
        // Calculated stats (base + item bonuses)
        this.calculatedMaxHealth = 100;
        this.calculatedHealthRegen = 1;
        this.calculatedDamage = 10;
        this.calculatedAttackSpeed = 1;
        this.calculatedProjectileSpeed = 500;
        this.calculatedMoveSpeed = 4;
        this.calculatedArmor = 0;
        this.calculatedCritChance = 0.05;
        // Player inventory
        this.items = new schema_1.ArraySchema();
        this.xp = 0;
        this.level = 1;
        // Input buffer for server-side processing
        this.inputX = 0;
        this.inputY = 0;
        // Combat and state flags
        this.isDead = false;
        this.isDashing = false;
        this.dashEndTime = 0;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "maxHealth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "healthRegen", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "damage", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "attackSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "projectileSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "moveSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "armor", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "critChance", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "attackCooldown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedMaxHealth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedHealthRegen", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedDamage", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedAttackSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedProjectileSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedMoveSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedArmor", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "calculatedCritChance", void 0);
__decorate([
    (0, schema_1.type)([ItemState]),
    __metadata("design:type", Object)
], Player.prototype, "items", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "xp", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "level", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isDead", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isDashing", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "dashEndTime", void 0);
class Enemy extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.x = 0;
        this.y = 0;
        this.typeId = "";
        this.health = 1;
        this.maxHealth = 1;
        this.damage = 1;
        this.moveSpeed = 1;
        this.attackCooldown = 0;
        this.attackRange = 0;
        this.projectileSpeed = 0;
        this.projectileType = "";
        this.chargeCooldown = 0;
        this.chargeSpeed = 0;
        this.isCharging = false;
        this.chargeTargetX = 0;
        this.chargeTargetY = 0;
        this.telegraphTimer = 0; // Timer for the telegraph phase of Charger
        // New enemy type specific fields
        this.isExploding = false; // For Exploder enemies
        this.explosionTimer = 0; // Timer for explosion delay
        this.shieldActive = true; // For Shield enemies
        this.shieldCooldownTimer = 0; // Cooldown for shield regeneration
        this.swarmCount = 1; // For Swarm enemy grouping logic
        // Status Effects System
        this.isPoisoned = false; // Poison status effect
        this.poisonDamage = 0; // Poison damage per second
        this.poisonDuration = 0; // Poison remaining duration
        this.poisonStacks = 0; // Number of poison stacks
        this.isBurning = false; // Fire status effect
        this.burnDamage = 0; // Burn damage per second
        this.burnDuration = 0; // Burn remaining duration
        this.isChilled = false; // Chill status effect
        this.chillSlowdown = 0; // Movement speed reduction
        this.chillDuration = 0; // Chill remaining duration
        this.isVulnerable = false; // Vulnerability status effect
        this.vulnerabilityMultiplier = 1; // Damage taken multiplier
        this.vulnerabilityDuration = 0; // Vulnerability remaining duration
        this.isElite = false; // Elite enemy flag
        this.eliteColor = ""; // Elite enemy color
    }
}
exports.Enemy = Enemy;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Enemy.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Enemy.prototype, "typeId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "maxHealth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "damage", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "moveSpeed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "attackCooldown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "attackRange", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "projectileSpeed", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Enemy.prototype, "projectileType", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chargeCooldown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chargeSpeed", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isCharging", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chargeTargetX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chargeTargetY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "telegraphTimer", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isExploding", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "explosionTimer", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "shieldActive", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "shieldCooldownTimer", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "swarmCount", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isPoisoned", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "poisonDamage", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "poisonDuration", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "poisonStacks", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isBurning", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "burnDamage", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "burnDuration", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isChilled", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chillSlowdown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "chillDuration", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isVulnerable", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "vulnerabilityMultiplier", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Enemy.prototype, "vulnerabilityDuration", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Enemy.prototype, "isElite", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Enemy.prototype, "eliteColor", void 0);
class Projectile extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.speed = 0;
        this.damage = 0;
        this.ownerId = "";
        this.projectileType = "";
        this.timeToLive = 0; // Time in seconds before projectile despawns
    }
}
exports.Projectile = Projectile;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "speed", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "damage", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "ownerId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "projectileType", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "timeToLive", void 0);
class InteractableState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.type = ""; // "smallChest", "largeChest", "equipmentBarrel", etc.
        this.x = 0;
        this.y = 0;
        this.isOpen = false;
        this.itemRarity = ""; // for chests that guarantee specific rarity
        this.creditCost = 0; // for paid interactables
        this.choiceCount = 1; // for tri-shops
    }
}
exports.InteractableState = InteractableState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], InteractableState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], InteractableState.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], InteractableState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], InteractableState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], InteractableState.prototype, "isOpen", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], InteractableState.prototype, "itemRarity", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], InteractableState.prototype, "creditCost", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], InteractableState.prototype, "choiceCount", void 0);
class XPEntityState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.x = 0;
        this.y = 0;
        this.xpValue = 10;
    }
}
exports.XPEntityState = XPEntityState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], XPEntityState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], XPEntityState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], XPEntityState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], XPEntityState.prototype, "xpValue", void 0);
class MyRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.enemies = new schema_1.MapSchema();
        this.projectiles = new schema_1.MapSchema();
        this.interactables = new schema_1.MapSchema();
        this.xpEntities = new schema_1.MapSchema();
        this.worldWidth = 8000;
        this.worldHeight = 6000;
        // Game state
        this.timeElapsed = 0;
        this.difficultyLevel = "Easy";
        this.beaconState = "inactive"; // "inactive", "charging", "bossFight", "stageComplete"
        this.holdoutTimer = 0;
        this.stageLevel = 1;
    }
}
exports.MyRoomState = MyRoomState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], MyRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: Enemy }),
    __metadata("design:type", Object)
], MyRoomState.prototype, "enemies", void 0);
__decorate([
    (0, schema_1.type)({ map: Projectile }),
    __metadata("design:type", Object)
], MyRoomState.prototype, "projectiles", void 0);
__decorate([
    (0, schema_1.type)({ map: InteractableState }),
    __metadata("design:type", Object)
], MyRoomState.prototype, "interactables", void 0);
__decorate([
    (0, schema_1.type)({ map: XPEntityState }),
    __metadata("design:type", Object)
], MyRoomState.prototype, "xpEntities", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MyRoomState.prototype, "worldWidth", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MyRoomState.prototype, "worldHeight", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MyRoomState.prototype, "timeElapsed", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MyRoomState.prototype, "difficultyLevel", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], MyRoomState.prototype, "beaconState", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MyRoomState.prototype, "holdoutTimer", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], MyRoomState.prototype, "stageLevel", void 0);
