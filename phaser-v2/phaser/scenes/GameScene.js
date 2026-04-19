import { createSandboxTextures } from "../fx/createSandboxTextures.js";
import { getCurrentAttackBox, getAttackDamage, getSlashColor } from "../combat/playerAttackProfiles.js";
import { PlayerController } from "../entities/PlayerController.js";
import { TrainingDummy } from "../entities/TrainingDummy.js";
import { createInputMap } from "../input/createInputMap.js";
import { createDomUiBridge } from "../ui/domUiBridge.js";
import { spawnTestLayout } from "../world/testLayout.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.isStarted = false;
  }

  preload() {}

  create() {
    createSandboxTextures(this);
    this.createBackdrop();

    this.ui = createDomUiBridge(this);
    this.inputMap = createInputMap(this);

    this.physics.world.setBounds(0, 0, 1280, 720);
    this.cameras.main.setBounds(0, 0, 1280, 720);

    this.solids = this.physics.add.staticGroup();
    spawnTestLayout(this, this.solids);

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

  createBackdrop() {
    this.add.rectangle(640, 360, 1280, 720, 0x0b1020);
    this.add.circle(960, 140, 140, 0x6677d6, 0.12);
    this.add.circle(220, 120, 110, 0xeadfa0, 0.08);
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
