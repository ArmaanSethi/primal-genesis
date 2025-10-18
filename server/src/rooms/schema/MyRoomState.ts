import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = Math.floor(Math.random() * 800);
  @type("number") y: number = Math.floor(Math.random() * 600);

  @type("number") maxHealth: number = 100;
  @type("number") health: number = 100;
  @type("number") healthRegen: number = 1;
  @type("number") damage: number = 10;
  @type("number") attackSpeed: number = 1;
  @type("number") moveSpeed: number = 4;
  @type("number") armor: number = 0;
  @type("number") critChance: number = 0.05;

  // Input buffer for server-side processing
  inputX: number = 0;
  inputY: number = 0;
}

export class Enemy extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") typeId: string = "";

  @type("number") health: number = 1;
  @type("number") maxHealth: number = 1;
  @type("number") damage: number = 1;
  @type("number") moveSpeed: number = 1;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();

  @type("number") worldWidth: number = 1600;
  @type("number") worldHeight: number = 1600;
}
