import { createSandboxTextures } from "../fx/createSandboxTextures.js";
import { getCurrentAttackBox, getAttackDamage, getSlashColor } from "../combat/playerAttackProfiles.js";
import { PlayerController } from "../entities/PlayerController.js";
import { TrainingDummy } from "../entities/TrainingDummy.js";
import { createInputMap } from "../input/createInputMap.js";
import { createImpactFeedbackSystem } from "../systems/impactFeedbackSystem.js";
import { createDomUiBridge } from "../ui/domUiBridge.js";
import { getRoomLayout, spawnRoomLayout } from "../world/testLayout.js";

const ROOM_MODE_STORAGE_KEY = "shadow-shift-phaser-room-mode";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.isStarted = false;
    this.roomMode = "presentation";
    this.autoStart = false;
  }

  init(data) {
    this.roomMode = data?.roomMode ?? window.localStorage.getItem(ROOM_MODE_STORAGE_KEY) ?? "presentation";
    this.autoStart = Boolean(data?.autoStart);
  }

  preload() {}

  create() {
    createSandboxTextures(this);
    this.createBackdrop();

    this.ui = createDomUiBridge(this);
    this.inputMap = createInputMap(this);
    this.impactFeedback = createImpactFeedbackSystem(this);

    this.physics.world.setBounds(0, 0, 1280, 720);
    this.cameras.main.setBounds(0, 0, 1280, 720);

    this.solids = this.physics.add.staticGroup();
    this.roomLayout = spawnRoomLayout(this, this.solids, this.roomMode);

    this.player = new PlayerController(this, this.roomLayout.spawn.x, this.roomLayout.spawn.y, this.inputMap);
    this.physics.add.collider(this.player.sprite, this.solids);
    this.trainingDummies = this.roomLayout.dummySpawns.map(
      ({ x, y, label }) => new TrainingDummy(this, x, y, label)
    );
    for (const dummy of this.trainingDummies) {
      this.physics.add.collider(dummy.sprite, this.solids);
    }

    this.attackGraphics = this.add.graphics().setDepth(6);
    this.statusText = this.add.text(24, 76, "Attack sandbox offline", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0);
    this.playerStateText = this.add.text(24, 94, "Vessel HP 5/5", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0);

    this.add.text(24, 24, "Shadow Shift V2 Phaser", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f4efe1"
    }).setScrollFactor(0);

    this.add.text(24, 52, "Phases 1 through 6 completed in this branch", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0);

    this.ui.setRoomLabel(this.roomLayout.label);
    this.ui.setRoomModeButtonLabel(this.roomMode === "test" ? "Switch To Ruin Hall" : "Switch To Test Room");

    if (this.autoStart) {
      this.startRun();
    }
  }

  createBackdrop() {
    this.add.rectangle(640, 360, 1280, 720, 0x070b14);
    this.add.circle(950, 110, 180, 0x7284df, 0.1);
    this.add.circle(280, 128, 124, 0xe7c982, 0.06);
    this.add.rectangle(640, 650, 1280, 240, 0x05070d, 0.9);

    for (const layer of [
      { y: 500, color: 0x0e1420, alpha: 0.9, points: [0, 460, 160, 402, 320, 432, 520, 376, 760, 450, 970, 395, 1280, 446] },
      { y: 560, color: 0x11192a, alpha: 0.8, points: [0, 520, 170, 470, 370, 508, 640, 448, 860, 526, 1090, 474, 1280, 520] }
    ]) {
      const graphics = this.add.graphics().setDepth(-1);
      graphics.fillStyle(layer.color, layer.alpha);
      graphics.beginPath();
      graphics.moveTo(0, 720);
      for (let i = 0; i < layer.points.length; i += 2) {
        graphics.lineTo(layer.points[i], layer.points[i + 1]);
      }
      graphics.lineTo(1280, 720);
      graphics.closePath();
      graphics.fillPath();
    }

    for (const x of [96, 188, 388, 874, 1180]) {
      this.add.rectangle(x, 332, 18, 286, 0x121a29, 0.32).setDepth(0);
      this.add.rectangle(x, 182, 44, 20, 0x1a2233, 0.28).setDepth(0);
    }

    for (const y of [142, 210, 286]) {
      this.add.ellipse(640, y, 980, 54, 0x8ea2e8, 0.028).setDepth(0);
    }
  }

  startRun() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.ui.hideStartOverlay();
  }

  toggleRoomMode() {
    const nextMode = this.roomMode === "test" ? "presentation" : "test";
    window.localStorage.setItem(ROOM_MODE_STORAGE_KEY, nextMode);
    this.scene.restart({
      roomMode: nextMode,
      autoStart: this.isStarted
    });
  }

  update(_time, delta) {
    if (!this.isStarted && this.inputMap.wasPressed("start")) {
      this.startRun();
    }

    if (!this.isStarted) {
      return;
    }

    this.player.update(delta);
    this.impactFeedback.triggerLanding(this.player.consumeLandingImpact());

    if (this.inputMap.wasPressed("debugDamage")) {
      const result = this.player.applyDamage({
        damage: 1,
        sourceX: this.player.sprite.x - this.player.facing * 32
      });
      if (result) {
        this.statusText.setText(
          result.defeated
            ? "Vessel broken: respawn queued"
            : `Vessel hurt: ${this.player.getHealth()}/${this.player.getMaxHealth()} HP`
        );
      }
    }

    if (this.player.consumeRespawnRequest()) {
      this.player.resetTo(this.roomLayout.spawn.x, this.roomLayout.spawn.y);
      this.ui.setObjective("Respawned at the movement start point");
      this.statusText.setText("Vessel restored at the gate");
    }

    for (const dummy of this.trainingDummies) {
      dummy.update(delta);
    }
    this.updateCombatSandbox(delta);
    this.playerStateText.setText(
      this.player.isDead()
        ? "Vessel HP 0/5 | rebuilding..."
        : `Vessel HP ${this.player.getHealth()}/${this.player.getMaxHealth()}${this.player.isInvulnerable() ? " | invulnerable" : ""}`
    );

    if (this.player.sprite.y > 900) {
      this.player.resetTo(this.roomLayout.spawn.x, this.roomLayout.spawn.y);
      this.ui.setObjective("Respawned at the movement start point");
      return;
    }

    this.ui.setObjective(
      this.player.wallSliding
        ? "Wall slide active: jump away or dash through the gap"
        : this.player.getActiveAttackProfile()
          ? `${this.roomLayout.label}: chain attacks or downslash from the air`
          : `${this.roomLayout.label}: run, jump, dash, attack`
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
