import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    fps: {
        target: 60,
        forceSetTimeOut: true,
        smoothStep: false,
    },
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },
    backgroundColor: '#b6d53c',
    parent: 'game-container',
    physics: {
        default: "arcade",
        arcade: {
            debug: false // Set to true to see physics bodies
        }
    },
    pixelArt: false, // Disable pixelArt for smoother text rendering
    roundPixels: false, // Allow sub-pixel positioning for smoother rendering
    scene: [GameScene],
};

export default new Phaser.Game(config);
