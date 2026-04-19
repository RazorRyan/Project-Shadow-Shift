export function createSandboxTextures(scene) {
  if (!scene.textures.exists("player-block")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xf4efe1, 1);
    graphics.fillRoundedRect(0, 0, 42, 64, 10);
    graphics.lineStyle(2, 0x191826, 1);
    graphics.strokeRoundedRect(1, 1, 40, 62, 10);
    graphics.generateTexture("player-block", 42, 64);
    graphics.destroy();
  }

  if (!scene.textures.exists("solid-block")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x2a3146, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.lineStyle(2, 0x404b6c, 1);
    graphics.strokeRect(1, 1, 62, 62);
    graphics.generateTexture("solid-block", 64, 64);
    graphics.destroy();
  }

  if (!scene.textures.exists("training-dummy")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x6d7ea6, 1);
    graphics.fillRoundedRect(0, 0, 56, 86, 8);
    graphics.fillStyle(0x222736, 1);
    graphics.fillCircle(28, 24, 12);
    graphics.lineStyle(3, 0xe7ebf7, 0.9);
    graphics.strokeRoundedRect(1, 1, 54, 84, 8);
    graphics.generateTexture("training-dummy", 56, 86);
    graphics.destroy();
  }
}
