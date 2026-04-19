export const gameConfig = {
  type: Phaser.AUTO,
  parent: "phaser-root",
  width: 1280,
  height: 720,
  backgroundColor: "#0a0d16",
  pixelArt: false,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: []
};
