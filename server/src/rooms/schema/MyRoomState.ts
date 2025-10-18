import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("number") x: number = Math.floor(Math.random() * 800);
  @type("number") y: number = Math.floor(Math.random() * 600);

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

  // Input buffer for server-side processing
  inputX: number = 0;
  inputY: number = 0;
}

  @type("number") attackCooldown: number = 0;
  @type("number") attackRange: number = 0;
  @type("number") projectileSpeed: number = 0;
  @type("string") projectileType: string = "";
  @type("number") chargeCooldown: number = 0;
  @type("number") chargeSpeed: number = 0;
  @type("boolean") isCharging: boolean = false;
  @type("number") chargeTargetX: number = 0;
  @type("number") chargeTargetY: number = 0;
}

export class Projectile extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("number") speed: number = 0;
  @type("number") damage: number = 0;
  @type("string") ownerId: string = "";
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();

  @type("number") worldWidth: number = 3200;
  @type("number") worldHeight: number = 3200;
}
