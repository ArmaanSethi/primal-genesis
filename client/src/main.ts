import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    fps: {
        target: 60,
        forceSetTimeOut: true,
        smoothStep: false,
    },
    width: 800,
    height: 600,
    // height: 200,
    backgroundColor: '#b6d53c',
    parent: 'phaser-example',
    physics: {
        default: "arcade",
        arcade: {
            debug: false // Set to true to see physics bodies
        }
    },
    pixelArt: true,
    scene: [GameScene],
};

export default new Phaser.Game(config);
