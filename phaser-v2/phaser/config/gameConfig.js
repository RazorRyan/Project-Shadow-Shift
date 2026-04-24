export const gameConfig = {
  type: Phaser.AUTO,
  parent: "phaser-root",
  backgroundColor: "#0a0d16",
  pixelArt: false,
  // Mobile fullscreen: Scale Manager fits the canvas inside the parent container
  // while preserving the 1280×720 internal resolution and centering the result.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
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
