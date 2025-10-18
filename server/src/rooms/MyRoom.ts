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
    this.state.players.forEach((player, sessionId) => {
      const speed = player.moveSpeed;
      if (player.inputX !== 0 || player.inputY !== 0) {
        player.x += player.inputX * speed;
        player.y += player.inputY * speed;
      }
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
