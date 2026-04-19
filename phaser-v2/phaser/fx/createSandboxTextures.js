export function createSandboxTextures(scene) {
  if (!scene.textures.exists("player-block")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xf3efdf, 1);
    graphics.fillRoundedRect(8, 14, 26, 40, 10);
    graphics.fillStyle(0x111522, 1);
    graphics.fillEllipse(21, 18, 22, 18);
    graphics.fillStyle(0xf3efdf, 1);
    graphics.fillCircle(14, 17, 6);
    graphics.fillCircle(28, 17, 6);
    graphics.fillStyle(0x111522, 1);
    graphics.fillCircle(14, 17, 2);
    graphics.fillCircle(28, 17, 2);
    graphics.fillStyle(0x7c8bd8, 0.95);
    graphics.fillRoundedRect(11, 28, 20, 19, 6);
    graphics.fillStyle(0xc7d5ff, 0.85);
    graphics.fillRect(16, 27, 10, 22);
    graphics.lineStyle(2, 0x171b29, 1);
    graphics.strokeRoundedRect(8, 14, 26, 40, 10);
    graphics.lineStyle(2, 0xe8dcc3, 0.9);
    graphics.strokeLineShape(new Phaser.Geom.Line(12, 8, 18, 17));
    graphics.strokeLineShape(new Phaser.Geom.Line(30, 8, 24, 17));
    graphics.generateTexture("player-block", 42, 64);
    graphics.destroy();
  }

  if (!scene.textures.exists("solid-block")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x202636, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x2d364c, 1);
    graphics.fillRect(0, 0, 64, 10);
    graphics.fillStyle(0x141926, 0.7);
    graphics.fillRect(0, 42, 64, 22);
    graphics.lineStyle(2, 0x404b6c, 1);
    graphics.strokeRect(1, 1, 62, 62);
    graphics.lineStyle(1, 0x586681, 0.3);
    graphics.strokeLineShape(new Phaser.Geom.Line(12, 10, 12, 64));
    graphics.strokeLineShape(new Phaser.Geom.Line(32, 10, 32, 64));
    graphics.strokeLineShape(new Phaser.Geom.Line(52, 10, 52, 64));
    graphics.strokeLineShape(new Phaser.Geom.Line(0, 28, 64, 28));
    graphics.strokeLineShape(new Phaser.Geom.Line(0, 46, 64, 46));
    graphics.generateTexture("solid-block", 64, 64);
    graphics.destroy();
  }

  if (!scene.textures.exists("training-dummy")) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x161a27, 1);
    graphics.fillRoundedRect(15, 20, 26, 50, 10);
    graphics.fillStyle(0xc7d2ec, 1);
    graphics.fillCircle(28, 19, 14);
    graphics.fillStyle(0x171b28, 1);
    graphics.fillCircle(22, 19, 3);
    graphics.fillCircle(34, 19, 3);
    graphics.lineStyle(3, 0xdcae76, 1);
    graphics.strokeLineShape(new Phaser.Geom.Line(17, 9, 10, 3));
    graphics.strokeLineShape(new Phaser.Geom.Line(39, 9, 46, 3));
    graphics.fillStyle(0x6a7697, 1);
    graphics.fillRoundedRect(18, 34, 20, 16, 4);
    graphics.lineStyle(2, 0xeff3ff, 0.85);
    graphics.strokeRoundedRect(15, 20, 26, 50, 10);
    graphics.generateTexture("training-dummy", 56, 86);
    graphics.destroy();
  }

  if (!scene.textures.exists("enemy-grunt")) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // body
    g.fillStyle(0x2a1a12, 1);
    g.fillRoundedRect(8, 18, 24, 40, 8);
    // head
    g.fillStyle(0xb06850, 1);
    g.fillCircle(20, 16, 12);
    // eyes — hostile red
    g.fillStyle(0xff3020, 1);
    g.fillCircle(14, 14, 3);
    g.fillCircle(26, 14, 3);
    // horns
    g.lineStyle(2, 0x7a3820, 1);
    g.strokeLineShape(new Phaser.Geom.Line(12, 6, 7, 0));
    g.strokeLineShape(new Phaser.Geom.Line(28, 6, 33, 0));
    // outline
    g.lineStyle(2, 0x7a3820, 0.9);
    g.strokeRoundedRect(8, 18, 24, 40, 8);
    g.generateTexture("enemy-grunt", 40, 62);
    g.destroy();
  }

  if (!scene.textures.exists("shadow-tile")) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a0835, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x6030d0, 0.18);
    g.fillRect(0, 0, 64, 8);
    g.fillStyle(0x4a20b0, 0.22);
    g.fillRect(0, 56, 64, 8);
    g.lineStyle(2, 0x9060ff, 0.55);
    g.strokeRect(1, 1, 62, 62);
    g.lineStyle(1, 0xc090ff, 0.18);
    g.strokeLineShape(new Phaser.Geom.Line(16, 1, 16, 63));
    g.strokeLineShape(new Phaser.Geom.Line(32, 1, 32, 63));
    g.strokeLineShape(new Phaser.Geom.Line(48, 1, 48, 63));
    g.generateTexture("shadow-tile", 64, 64);
    g.destroy();
  }
}
