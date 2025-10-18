import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = Math.floor(Math.random() * 800);
  @type("number") y: number = Math.floor(Math.random() * 600);

  // Input buffer
  inputX: number = 0;
  inputY: number = 0;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
