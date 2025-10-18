import { Room, Client } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {

  onCreate (options: any) {
    this.setState(new MyRoomState());

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    // Handle player input
    this.onMessage("input", (client, input: { x: number, y: number }) => {
      console.log(`Received input from ${client.sessionId}:`, input);
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputX = input.x;
        player.inputY = input.y;
      }
    });
  }

  update(deltaTime: number) {
    this.state.players.forEach((player, sessionId) => {
      const speed = 4;
      if (player.inputX !== 0 || player.inputY !== 0) {
        player.x += player.inputX * speed;
        player.y += player.inputY * speed;
      }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
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