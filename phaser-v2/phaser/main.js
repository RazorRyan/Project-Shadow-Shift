import { gameConfig } from "./config/gameConfig.js";
import { GameScene } from "./scenes/GameScene.js";

gameConfig.scene = [GameScene];
new Phaser.Game(gameConfig);
