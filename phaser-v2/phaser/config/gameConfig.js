export const gameConfig = {
  type: Phaser.AUTO,
  parent: "phaser-root",
  backgroundColor: "#0a0d16",
  pixelArt: false,
  // EXPAND fills the container fully and shows extra world on ultra-wide screens
  // (e.g. Samsung S25 landscape 19.5:9). The internal 1280×720 baseline is the
  // minimum visible area; wider devices simply see more of the game world.
  scale: {
    mode: Phaser.Scale.EXPAND,
    width: 1280,
    height: 720,
    autoCenter: Phaser.Scale.NO_CENTER,
    expandParent: false,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: []
};
