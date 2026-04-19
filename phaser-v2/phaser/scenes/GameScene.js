import { createDomUiBridge } from "../adapters/domUiBridge.js";
import { getCurrentAttackBox, getAttackDamage, getSlashColor } from "../combat/playerAttackProfiles.js";
import { PlayerController } from "../entities/PlayerController.js";
import { TrainingDummy } from "../entities/TrainingDummy.js";
import { createInputMap } from "../input/createInputMap.js";

const TEST_LAYOUT = {
  platforms: [
    { x: 0, y: 620, w: 420, h: 100 },
    { x: 520, y: 620, w: 260, h: 100 },
    { x: 920, y: 620, w: 220, h: 100 },
    { x: 240, y: 530, w: 120, h: 16 },
    { x: 670, y: 470, w: 96, h: 16 }
  ],
  walls: [
    { x: 760, y: 320, w: 28, h: 300 },
    { x: 1120, y: 430, w: 30, h: 190 }
  ]
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.isStarted = false;
  }

  preload() {}

  create() {
    this.createTextures();
    this.createBackdrop();

    this.ui = createDomUiBridge(this);
    this.inputMap = createInputMap(this);

    this.physics.world.setBounds(0, 0, 1280, 720);
    this.cameras.main.setBounds(0, 0, 1280, 720);

    this.solids = this.physics.add.staticGroup();
    this.spawnTestLayout();

    this.player = new PlayerController(this, 120, 540, this.inputMap);
    this.physics.add.collider(this.player.sprite, this.solids);
    this.trainingDummies = [
      new TrainingDummy(this, 920, 534, "Ruin Husk"),
      new TrainingDummy(this, 1070, 534, "Guard Shell")
    ];
    for (const dummy of this.trainingDummies) {
      this.physics.add.collider(dummy.sprite, this.solids);
    }

    this.attackGraphics = this.add.graphics().setDepth(6);
    this.statusText = this.add.text(24, 76, "Attack sandbox offline", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0);

    this.add.text(24, 24, "Shadow Shift V2 Phaser", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f4efe1"
    }).setScrollFactor(0);

    this.add.text(24, 52, "Phase 1 + 3 migration sandbox", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0);
  }

  createTextures() {
    if (!this.textures.exists("player-block")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xf4efe1, 1);
      graphics.fillRoundedRect(0, 0, 42, 64, 10);
      graphics.lineStyle(2, 0x191826, 1);
      graphics.strokeRoundedRect(1, 1, 40, 62, 10);
      graphics.generateTexture("player-block", 42, 64);
      graphics.destroy();
    }

    if (!this.textures.exists("solid-block")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x2a3146, 1);
      graphics.fillRect(0, 0, 64, 64);
      graphics.lineStyle(2, 0x404b6c, 1);
      graphics.strokeRect(1, 1, 62, 62);
      graphics.generateTexture("solid-block", 64, 64);
      graphics.destroy();
    }

    if (!this.textures.exists("training-dummy")) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
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

  createBackdrop() {
    this.add.rectangle(640, 360, 1280, 720, 0x0b1020);
    this.add.circle(960, 140, 140, 0x6677d6, 0.12);
    this.add.circle(220, 120, 110, 0xeadfa0, 0.08);
  }

  spawnTestLayout() {
    for (const platform of TEST_LAYOUT.platforms) {
      this.createStaticBlock(platform, 0x33405a);
    }

    for (const wall of TEST_LAYOUT.walls) {
      this.createStaticBlock(wall, 0x2b3650);
    }
  }

  createStaticBlock(rect, tint) {
    const block = this.solids.create(rect.x + rect.w / 2, rect.y + rect.h / 2, "solid-block");
    block.setDisplaySize(rect.w, rect.h);
    block.setTint(tint);
    block.refreshBody();
    return block;
  }

  startRun() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.ui.hideStartOverlay();
  }

  update(_time, delta) {
    if (!this.isStarted) {
      return;
    }

    this.player.update(delta);
    for (const dummy of this.trainingDummies) {
      dummy.update(delta);
    }
    this.updateCombatSandbox(delta);

    if (this.player.sprite.y > 900) {
      this.player.resetTo(120, 540);
      this.ui.setObjective("Respawned at the movement start point");
      return;
    }

    this.ui.setObjective(
      this.player.wallSliding
        ? "Wall slide active: jump away or dash through the gap"
        : this.player.getActiveAttackProfile()
          ? "Combat sandbox: chain attacks or downslash from the air"
          : "Movement + combat sandbox: run, jump, dash, attack"
    );
  }

  updateCombatSandbox(_delta) {
    this.attackGraphics.clear();

    const profile = this.player.getActiveAttackProfile();
    if (!profile) {
      this.statusText.setText("Attack sandbox ready: F to slash, hold S or Down in air for downslash");
      return;
    }

    const attackBox = getCurrentAttackBox(this.player, profile);
    const slashColor = getSlashColor(profile);
    this.attackGraphics.fillStyle(slashColor, 0.22);
    this.attackGraphics.lineStyle(2, slashColor, 0.85);
    this.attackGraphics.fillRect(attackBox.x, attackBox.y, attackBox.w, attackBox.h);
    this.attackGraphics.strokeRect(attackBox.x, attackBox.y, attackBox.w, attackBox.h);

    for (const dummy of this.trainingDummies) {
      if (!dummy.isAlive() || dummy.invulnTimer > 0 || this.player.hasHitTarget(dummy.label)) {
        continue;
      }

      const hurtbox = dummy.getHurtbox();
      if (!Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(attackBox.x, attackBox.y, attackBox.w, attackBox.h),
        new Phaser.Geom.Rectangle(hurtbox.x, hurtbox.y, hurtbox.w, hurtbox.h)
      )) {
        continue;
      }

      this.player.registerAttackHit(dummy.label);
      const hit = {
        damage: getAttackDamage(profile),
        hitTag: profile.hitTag ?? "light",
        knockbackX: this.player.facing * (profile.type === "downslash" ? 140 : profile.knockback),
        finisher: Boolean(profile.finisher)
      };
      const result = dummy.applyHit(hit);
      if (profile.type === "downslash") {
        this.player.sprite.body.setVelocityY(-profile.bounceStrength);
      }

      this.cameras.main.shake(profile.finisher ? 90 : profile.hitTag === "heavy" ? 70 : 50, 0.003);
      this.statusText.setText(
        result?.defeated
          ? `${dummy.label} broken by ${profile.id}`
          : `${profile.id} connected for ${hit.damage} damage`
      );
    }
  }
}
