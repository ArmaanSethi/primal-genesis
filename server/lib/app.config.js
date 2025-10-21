"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = __importDefault(require("@colyseus/tools"));
const MyRoom_1 = require("./rooms/MyRoom");
exports.default = (0, tools_1.default)({
    initializeGameServer: (gameServer) => {
        gameServer.define('my_room', MyRoom_1.MyRoom);
    },
    initializeExpress: (app) => {
        // Express routes (if any)
    },
});
