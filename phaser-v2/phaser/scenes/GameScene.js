import { createSandboxTextures } from "../fx/createSandboxTextures.js";
import { getCurrentAttackBox, getAttackDamage, getSlashColor } from "../combat/playerAttackProfiles.js";
import { buildHitEvent, resolveAppliedAttack } from "../combat/combatResolver.js";
import { PlayerController } from "../entities/PlayerController.js";
import { TrainingDummy } from "../entities/TrainingDummy.js";
import { EnemyBase } from "../entities/EnemyBase.js";
import { RuinHusk } from "../entities/RuinHusk.js";
import { createInputMap } from "../input/createInputMap.js";
import { createImpactFeedbackSystem } from "../systems/impactFeedbackSystem.js";
import { createDomUiBridge } from "../ui/domUiBridge.js";
import { spawnRoomLayout } from "../world/testLayout.js";
import { loadRoom } from "../world/roomLoader.js";
import { createRoomTransitionSystem } from "../systems/roomTransitionSystem.js";
import { saveManager } from "../save/saveManager.js";
import { createAbilitySystem } from "../systems/abilitySystem.js";
import { createShadowSwapSystem } from "../systems/shadowSwapSystem.js";
import { createElementSystem } from "../systems/elementSystem.js";
import { ELEMENT_COLORS, getElementMultiplier } from "../data/elementData.js";
import { createWeaponSystem } from "../systems/weaponSystem.js";
import { createAudioSystem } from "../systems/audioSystem.js";
import { createHudManager } from "../ui/hudManager.js";
import { createCheckpointSystem } from "../world/checkpointSystem.js";
import { NpcEntity } from "../entities/NpcEntity.js";
import { createDialogueRenderer } from "../ui/dialogueRenderer.js";
import { DIALOGUE } from "../data/dialogueData.js";

/** Set to true to show hitboxes, HP overlay, and status log. */
const DEBUG = false;

const ROOM_MODE_STORAGE_KEY = "shadow-shift-phaser-room-mode";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.isStarted = false;
    this.roomMode = "presentation";
    this.roomId = null;
    this.spawnId = "default";
    this.autoStart = false;
    this.transitioning = false;
  }

  init(data) {
    this.roomId   = data?.roomId   ?? null;
    this.spawnId  = data?.spawnId  ?? "default";
    this.roomMode = data?.roomMode ?? (DEBUG ? window.localStorage.getItem(ROOM_MODE_STORAGE_KEY) : null) ?? "presentation";
    this.autoStart    = Boolean(data?.autoStart);
    this.transitioning = false;
  }

  preload() {}

  create() {
    createSandboxTextures(this);
    this.createBackdrop();

    this.ui = createDomUiBridge(this, DEBUG);
    this.inputMap = createInputMap(this);
    this.impactFeedback = createImpactFeedbackSystem(this);

    // Phase 13: ability system — init before save load
    const savedData = saveManager.load();
    this.abilities = createAbilitySystem(savedData?.unlockedAbilities ?? []);

    this.physics.world.setBounds(0, 0, 1280, 720);
    this.cameras.main.setBounds(0, 0, 1280, 720);

    this.solids = this.physics.add.staticGroup();

    // Phase 10/11: roomId routes to tilemap pipeline, else test layout
    if (this.roomId) {
      this.roomLayout = loadRoom(this, this.solids, this.roomId);
    } else {
      this.roomLayout = spawnRoomLayout(this, this.solids, this.roomMode);
    }

    // Phase 11: spawn from named spawnId
    const spawnPoint = this.roomLayout.spawns?.[this.spawnId] ?? this.roomLayout.spawn;

    this.player = new PlayerController(this, spawnPoint.x, spawnPoint.y, this.inputMap);
    // Phase 14: double jump
    this.player.canDoubleJump = this.abilities.has("double_jump");
    this.physics.add.collider(this.player.sprite, this.solids);

    // Phase 16: shadow group (disabled until swap)
    this.shadowGroup = this.roomLayout.shadowGroup ?? null;
    if (this.shadowGroup) {
      this.physics.add.collider(this.player.sprite, this.shadowGroup);
    }
    this.trainingDummies = this.roomLayout.dummySpawns.map(
      ({ x, y, label }) => new TrainingDummy(this, x, y, label)
    );
    for (const dummy of this.trainingDummies) {
      this.physics.add.collider(dummy.sprite, this.solids);
    }

    this.enemies = this.roomLayout.enemySpawns.map(
      ({ x, y }) => new RuinHusk(this, x, y, this.player)
    );
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, this.solids);
    }

    // Phase 11: transition system
    this.transitionSystem = createRoomTransitionSystem();

    // Phase 21: checkpoint system
    this.checkpointSystem = createCheckpointSystem();
    this.checkpointSystem.loadVisited(saveManager.load()?.visitedRooms ?? []);
    this.checkpointSystem.markRoomVisited(this.roomId ?? "ruin-hall");
    this.activateKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Phase 22: NPC dialogue
    this.dialogueRenderer = createDialogueRenderer();
    this.npcs = (this.roomLayout.npcSpawns ?? []).map(cfg => new NpcEntity(this, cfg));

    // Phase 15: shadow swap system
    this.swapSystem = createShadowSwapSystem();
    this.swapSystem.onSwap((phase) => this._applyShadowPhase(phase));

    // Phase 17: element system
    this.elementSystem = createElementSystem();
    this.elementSystem.onChange((el) => this.ui.setElement(el));

    // Phase 19: weapon system
    const savedWeaponStage = saveManager.load()?.weaponStage ?? 0;
    this.weaponSystem = createWeaponSystem(savedWeaponStage);
    this.weaponSystem.onUpgrade((stage) => this.ui.setWeapon(stage.label));
    this.ui.setWeapon(this.weaponSystem.getStage().label);

    // Phase 20: HUD manager
    this.hud = createHudManager(this.ui, this.player, this.elementSystem, this.weaponSystem, this.swapSystem);
    this.hud.pushAll();

    // Phase 24: audio system
    this.audio = createAudioSystem(this.sound);

    // Phase 12: save / load keys
    this.saveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.loadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    this.upgradeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);

    this.attackGraphics = this.add.graphics().setDepth(6);
    this.statusText = this.add.text(24, 76, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0).setVisible(DEBUG);
    this.playerStateText = this.add.text(24, 94, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#b7bfd6"
    }).setScrollFactor(0).setVisible(DEBUG);

    this.ui.setRoomLabel(this.roomLayout.label);
    this.ui.setRoomModeButtonLabel(
      (this.roomMode === "test" && !this.roomId) ? "Switch To Ruin Hall" : "Switch To Test Room"
    );

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
    const isTest = this.roomMode === "test" && !this.roomId;
    const nextMode = isTest ? "presentation" : "test";
    window.localStorage.setItem(ROOM_MODE_STORAGE_KEY, nextMode);
    this.scene.restart({ roomMode: nextMode, autoStart: this.isStarted });
  }

  update(_time, delta) {
    if (!this.isStarted && this.inputMap.wasPressed("start")) {
      this.startRun();
    }

    if (!this.isStarted) {
      return;
    }

    // Phase 12: save / load
    if (Phaser.Input.Keyboard.JustDown(this.saveKey)) {
      saveManager.save({
        roomId: this.roomId ?? "ruin-hall",
        playerHp: this.player.getHealth(),
        unlockedAbilities: this.abilities.listUnlocked(),
        weaponStage: this.weaponSystem.getStageIndex(),
        visitedRooms: this.checkpointSystem.getVisitedRooms(),
        checkpointId: this.checkpointSystem.getActive()?.id ?? null,
      });
      this.audio.onSave();
      this.statusText.setText("Saved");
      this.ui.setObjective("Game saved.");
      this._objectiveOverride = 2000;
    }
    if (Phaser.Input.Keyboard.JustDown(this.loadKey)) {
      const saved = saveManager.load();
      if (saved) {
        this.abilities = createAbilitySystem(saved.unlockedAbilities ?? []);
        this.player.canDoubleJump = this.abilities.has("double_jump");
        const wi = saved.weaponStage ?? 0;
        while (this.weaponSystem.getStageIndex() < wi) this.weaponSystem.upgradeToNext();
        this.ui.setWeapon(this.weaponSystem.getStage().label);
        this.statusText.setText(`Loaded | Weapon: ${this.weaponSystem.getStage().label}`);
        this.ui.setObjective("Save loaded.");
        this._objectiveOverride = 2000;
      } else {
        this.statusText.setText("No save found");
      }
    }

    // Phase 19: weapon upgrade test
    if (Phaser.Input.Keyboard.JustDown(this.upgradeKey)) {
      this.weaponSystem.upgradeToNext();
      this.audio.onWeaponUp();
      this.statusText.setText(`Weapon upgraded: ${this.weaponSystem.getStage().label}`);
    }

    // Phase 15: shadow swap
    if (this.inputMap.wasPressed("swap")) {
      this.swapSystem.swap();
      this.audio.onSwap();
    }

    // Phase 17: element cycle
    if (this.inputMap.wasPressed("element")) {
      this.elementSystem.cycleNext();
      this.audio.onElement();
    }

    this.player.update(delta);
    this.impactFeedback.triggerLanding(this.player.consumeLandingImpact());

    if (DEBUG && this.inputMap.wasPressed("debugDamage")) {
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

    const spawnPoint = this.roomLayout.spawns?.[this.spawnId] ?? this.roomLayout.spawn;

    if (this.player.consumeRespawnRequest()) {
      this.player.resetTo(spawnPoint.x, spawnPoint.y);
      this.ui.setObjective("Returned to last rest point.");
      this._objectiveOverride = 2000;
      this.statusText.setText("Vessel restored at the gate");
    }

    // Phase 22: NPC update / dialogue
    const interactJustDown = Phaser.Input.Keyboard.JustDown(this.activateKey);
    if (this.dialogueRenderer.isActive()) {
      if (interactJustDown || Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) {
        this.dialogueRenderer.advance();
      }
    } else {
      for (const npc of this.npcs ?? []) {
        const dlgId = npc.update(this.player, interactJustDown);
        if (dlgId && DIALOGUE[dlgId]) {
          this.dialogueRenderer.start(DIALOGUE[dlgId]);
          break;
        }
      }
    }

    // Phase 21: checkpoint activation (Z key)
    const cpHit = this.checkpointSystem.check(
      this.player,
      this.roomLayout.checkpoints ?? [],
      Phaser.Input.Keyboard.JustDown(this.activateKey)
    );
    if (cpHit) {
      this.audio.onCheckpoint();
      this.statusText.setText(`Checkpoint activated: ${cpHit.id}`);
      this.ui.setObjective("Rest point activated.");
      this._objectiveOverride = 2000;
    }

    for (const dummy of this.trainingDummies) {
      dummy.update(delta);
    }
    for (const enemy of this.enemies) {
      // Phase 26: skip AI update for enemies beyond 600px (still update timers/flash)
      enemy.update(delta, Math.abs(enemy.sprite.x - this.player.sprite.x) > 600);
    }
    this.hud.update();
    this.updateCombat(delta);
    this.playerStateText.setText(
      this.player.isDead()
        ? "Vessel HP 0/5 | rebuilding..."
        : `Vessel HP ${this.player.getHealth()}/${this.player.getMaxHealth()}${this.player.isInvulnerable() ? " | invulnerable" : ""}`
    );

    if (this.player.sprite.y > 900) {
      this.player.resetTo(spawnPoint.x, spawnPoint.y);
      this.ui.setObjective("Returned to last rest point.");
      this._objectiveOverride = 2000;
      return;
    }

    // Phase 11: room transitions
    if (!this.transitioning) {
      const exit = this.transitionSystem.check(this.player, this.roomLayout.exits ?? []);
      if (exit) {
        this.transitioning = true;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.restart({ roomId: exit.targetRoom, spawnId: exit.spawnId, autoStart: true });
        });
      }
    }

    if (!(this._objectiveOverride > 0)) {
      this.ui.setObjective(
        this.player.wallSliding ? "Wall slide" : this.roomLayout.label
      );
    }
    this._objectiveOverride = Math.max(0, (this._objectiveOverride ?? 0) - delta);
  }

  // Phase 15/16: apply visual + physics changes on world swap
  _applyShadowPhase(phase) {
    const isShadow = phase === "shadow";
    this.ui.setWorldPhase(isShadow ? "Shadow" : "Light");

    if (this.shadowGroup) {
      this.shadowGroup.getChildren().forEach(tile => {
        tile.setVisible(isShadow);
        tile.body.enable = isShadow;
        if (isShadow) { tile.refreshBody(); }
      });
    }

    const r = isShadow ? 60  : 220;
    const g = isShadow ? 0   : 220;
    const b = isShadow ? 160 : 255;
    this.cameras.main.flash(200, r, g, b, false);
  }

  updateCombat(_delta) {
    this.attackGraphics.clear();

    const profile = this.player.getActiveAttackProfile();
    if (!profile) return;

    const attackBox = getCurrentAttackBox(this.player, profile, this.weaponSystem.getRangeBonus());

    if (DEBUG) {
      const slashColor = getSlashColor(profile);
      this.attackGraphics.fillStyle(slashColor, 0.22);
      this.attackGraphics.lineStyle(2, slashColor, 0.85);
      this.attackGraphics.fillRect(attackBox.x, attackBox.y, attackBox.w, attackBox.h);
      this.attackGraphics.strokeRect(attackBox.x, attackBox.y, attackBox.w, attackBox.h);
    }

    const dummyHits = resolveAppliedAttack({
      attackBox,
      targets: this.trainingDummies,
      hasHitTarget: (targetId) => this.player.hasHitTarget(targetId),
      registerHitTarget: (targetId) => this.player.registerAttackHit(targetId),
      getTargetId: (target) => target.label,
      createHit: () => buildHitEvent(profile, this.player.facing, getAttackDamage(profile))
    });

    for (const { target: dummy, hit, result } of dummyHits) {
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

    const enemyHits = resolveAppliedAttack({
      attackBox,
      targets: this.enemies,
      hasHitTarget: (targetId) => this.player.hasHitTarget(targetId),
      registerHitTarget: (targetId) => this.player.registerAttackHit(targetId),
      getTargetId: (target) => `${target.label}:${target.sprite.x}:${target.sprite.y}`,
      createHit: (enemy) => {
        const elMult = getElementMultiplier(this.elementSystem.getElement(), enemy.stats?.weakness);
        const rawDamage = this.weaponSystem.applyDamage(getAttackDamage(profile));
        const finalDamage = elMult > 1 ? Math.ceil(rawDamage * elMult) : rawDamage;
        return buildHitEvent(profile, this.player.facing, finalDamage);
      }
    });

    for (const { target: enemy, hit, result } of enemyHits) {
      if (profile.type === "downslash") {
        this.player.sprite.body.setVelocityY(-profile.bounceStrength);
      }

      const shakeMs = profile.finisher ? 90 : profile.hitTag === "heavy" ? 70 : 50;
      this.cameras.main.shake(shakeMs, 0.003);
      const elMult = getElementMultiplier(this.elementSystem.getElement(), enemy.stats?.weakness);
      const reactionLabel = elMult > 1 ? ` [WEAK x${elMult.toFixed(2)}]` : "";
      this.statusText.setText(
        result?.defeated
          ? `${enemy.label} defeated by ${profile.id}${reactionLabel}`
          : `${profile.id} hit ${enemy.label} for ${hit.damage}${reactionLabel}`
      );
    }
  }
}
