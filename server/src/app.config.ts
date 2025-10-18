import config from "@colyseus/tools";
import { MyRoom } from "./rooms/MyRoom";

export default config({
    initializeGameServer: (gameServer) => {
        gameServer.define('my_room', MyRoom);
    },

    initializeExpress: (app) => {
        // Express routes (if any)
    },
});
