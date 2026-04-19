import { gameConfig } from "../config/gameConfig.js";
import { GameScene } from "../scenes/GameScene.js";

export function createGame() {
  gameConfig.scene = [GameScene];
  return new Phaser.Game(gameConfig);
}
