import { createSandboxTextures } from "../fx/createSandboxTextures.js";
import { getCurrentAttackBox, getAttackDamage, getSlashColor } from "../combat/playerAttackProfiles.js";
import { buildHitEvent, resolveAppliedAttack } from "../combat/combatResolver.js";
import { PlayerController } from "../entities/PlayerController.js";
import { TrainingDummy } from "../entities/TrainingDummy.js";
import { EnemyBase } from "../entities/EnemyBase.js";
import { RuinHusk } from "../entities/RuinHusk.js";
import { RuinOverseerBoss } from "../entities/RuinOverseerBoss.js";
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
import { ABILITY_IDS, getStartingAbilityIds } from "../data/abilityData.js";
import { ELEMENT_COLORS, getElementMultiplier, getElementReaction } from "../data/elementData.js";
import { SHADOW_SWAP_PHASES } from "../data/shadowSwapConfig.js";
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
const ROOM_TRANSITION_GRACE_MS = 450;

function overlapsRect(body, rect) {
  return (
    body.x < rect.x + rect.w &&
    body.x + body.width > rect.x &&
    body.y < rect.y + rect.h &&
    body.y + body.height > rect.y
  );
}

function createEnemy(scene, enemyConfig, player) {
  if (enemyConfig?.statKey === "ruin_overseer" || enemyConfig?.statKey === "eclipse_lord") {
    return new RuinOverseerBoss(scene, enemyConfig.x, enemyConfig.y, player, enemyConfig.statKey);
  }
  return new RuinHusk(scene, enemyConfig.x, enemyConfig.y, player, enemyConfig?.statKey ?? "ruin_husk");
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.isStarted = false;
    this.roomMode = "presentation";
    this.roomId = null;
    this.spawnId = "default";
    this.pendingSaveData = null;
    this.autoStart = false;
    this.transitioning = false;
  }

  init(data) {
    this.roomId   = data?.roomId   ?? null;
    this.spawnId  = data?.spawnId  ?? "default";
    this.pendingSaveData = data?.saveData ?? null;
    this.roomMode = data?.roomMode ?? (DEBUG ? window.localStorage.getItem(ROOM_MODE_STORAGE_KEY) : null) ?? "presentation";
    this.autoStart    = Boolean(data?.autoStart);
    this.transitioning = false;
  }

  preload() {}

  create() {
    createSandboxTextures(this);

    // Phase 13: ability system — init before save load
    const savedData = this.pendingSaveData ?? saveManager.load();
    this.initialWeaponStage = savedData?.weaponStage ?? 0;
    this.progressFlags = {
      barrierCleared: Boolean(savedData?.worldFlags?.barrierCleared),
      bossDefeated: Boolean(savedData?.worldFlags?.bossDefeated),
    };
    this.stageCleared = false;
    this.abilities = createAbilitySystem(savedData?.unlockedAbilities ?? getStartingAbilityIds());

    this.solids = this.physics.add.staticGroup();

    // Phase 10/11: roomId routes to tilemap pipeline, else test layout
    if (this.roomId) {
      this.roomLayout = loadRoom(this, this.solids, this.roomId);
    } else {
      this.roomLayout = spawnRoomLayout(this, this.solids, this.roomMode);
    }
    this.applyWorldBounds(this.roomLayout);
    this.createBackdrop(this.roomLayout);
    this.createStageLandmarks(this.roomLayout);

    this.ui = createDomUiBridge(this, DEBUG);
    this.inputMap = createInputMap(this);
    this.impactFeedback = createImpactFeedbackSystem(this);

    // Phase 11: spawn from named spawnId
    const spawnPoint = this.roomLayout.spawns?.[this.spawnId] ?? this.roomLayout.spawn;

    this.player = new PlayerController(this, spawnPoint.x, spawnPoint.y, this.inputMap);
    this.applyMovementAbilityLoadout();
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

    this.enemies = this.roomLayout.enemySpawns
      .filter((enemyConfig) => !(this.progressFlags.bossDefeated && enemyConfig.statKey === "eclipse_lord"))
      .map((enemyConfig) => createEnemy(this, enemyConfig, this.player));
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, this.solids);
    }

    this.createDynamicBlockers();

    // Phase 11: transition system
    this.transitionSystem = createRoomTransitionSystem();
    this.transitionSystem.arm(ROOM_TRANSITION_GRACE_MS, this.time.now);

    // Phase 21: checkpoint system
    this.checkpointSystem = createCheckpointSystem();
    this.checkpointSystem.loadVisited(savedData?.visitedRooms ?? []);
    this.checkpointSystem.markRoomVisited(this.roomId ?? "outer-rampart");
    this.activateKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.dialogueAdvanceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Phase 22: NPC dialogue
    this.dialogueRenderer = createDialogueRenderer();
    this.npcs = (this.roomLayout.npcSpawns ?? []).map(cfg => new NpcEntity(this, cfg));

    // Phase 15: shadow swap system
    this.swapSystem = createShadowSwapSystem();
    this.swapSystem.onSwap((phase) => this._applyShadowPhase(phase), { immediate: true });

    // Phase 17: element system
    this.elementSystem = createElementSystem(savedData?.element);

    // Phase 19: weapon system
    const savedWeaponStage = savedData?.weaponStage ?? 0;
    this.weaponSystem = createWeaponSystem(savedWeaponStage);
    this.player.setWeaponSystem(this.weaponSystem);
    this.weaponSystem.onUpgrade((stage) => this.ui.setWeapon(stage.label));
    this.ui.setWeapon(this.weaponSystem.getStage().label);

    // Phase 20: HUD manager
    this.hud = createHudManager(this.ui, this.player, this.elementSystem, this.weaponSystem, this.swapSystem, this.checkpointSystem);
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
    this.elementSystem.onChange((el) => {
      this.ui.setElement(el);
      this.statusText.setText(`Element attuned: ${el}`);
    }, { immediate: true });

    this.ui.setRoomLabel(this.roomLayout.label);
    this.ui.setRoomModeButtonLabel(
      (this.roomMode === "test" && !this.roomId) ? "Switch To Outer Rampart" : "Switch To Test Room"
    );
    this.restoreSaveState(savedData);
    this.ui.setObjective(this.getRoomEntryObjective());
    this._objectiveOverride = ROOM_TRANSITION_GRACE_MS;
    this.cameras.main.fadeIn(180, 0, 0, 0);

    if (this.autoStart) {
      this.startRun();
    }
  }

  createBackdrop(roomLayout = {}) {
    const isAsh = roomLayout.theme === "ash";
    const sky = isAsh ? 0x18100f : 0x070b14;
    const moonGlow = isAsh ? 0xff9a52 : 0x7284df;
    const secondaryGlow = isAsh ? 0xdbc27f : 0xe7c982;
    const floor = isAsh ? 0x080504 : 0x05070d;
    const layerA = isAsh ? 0x241412 : 0x0e1420;
    const layerB = isAsh ? 0x311c18 : 0x11192a;

    // Use a wide backdrop (3× the base width) so ultra-wide screens (e.g. 19.5:9)
    // see sky/floor instead of void beyond the base 1280-unit world boundary.
    const WIDE = 3840;
    this.add.rectangle(640, 360, WIDE, 720, sky);
    this.add.circle(950, 110, 180, moonGlow, isAsh ? 0.14 : 0.1);
    this.add.circle(280, 128, 124, secondaryGlow, isAsh ? 0.08 : 0.06);
    this.add.rectangle(640, 650, WIDE, 240, floor, 0.9);

    for (const layer of [
      { y: 500, color: layerA, alpha: 0.9, points: [0, 460, 160, 402, 320, 432, 520, 376, 760, 450, 970, 395, 1280, 446] },
      { y: 560, color: layerB, alpha: 0.8, points: [0, 520, 170, 470, 370, 508, 640, 448, 860, 526, 1090, 474, 1280, 520] }
    ]) {
      const firstY = layer.points[1];
      const lastY  = layer.points[layer.points.length - 1];
      const graphics = this.add.graphics().setDepth(-1);
      graphics.fillStyle(layer.color, layer.alpha);
      graphics.beginPath();
      // Extend left edge far off-screen so no void shows on ultra-wide displays
      graphics.moveTo(-WIDE / 2, 720);
      graphics.lineTo(-WIDE / 2, firstY);
      for (let i = 0; i < layer.points.length; i += 2) {
        graphics.lineTo(layer.points[i], layer.points[i + 1]);
      }
      // Extend right edge symmetrically
      graphics.lineTo(WIDE, lastY);
      graphics.lineTo(WIDE, 720);
      graphics.closePath();
      graphics.fillPath();
    }

    for (const x of [96, 188, 388, 874, 1180]) {
      this.add.rectangle(x, 332, 18, 286, isAsh ? 0x291917 : 0x121a29, 0.32).setDepth(0);
      this.add.rectangle(x, 182, 44, 20, isAsh ? 0x34211d : 0x1a2233, 0.28).setDepth(0);
    }

    for (const y of [142, 210, 286]) {
      this.add.ellipse(640, y, 980, 54, isAsh ? 0xffb36b : 0x8ea2e8, isAsh ? 0.036 : 0.028).setDepth(0);
    }
  }

  createStageLandmarks(roomLayout = {}) {
    const isAsh = roomLayout.theme === "ash";
    const markerTitle = roomLayout.markerTitle ?? roomLayout.label;
    const markerSubtitle = roomLayout.markerSubtitle ?? roomLayout.objectiveHint ?? "";

    this.add.text(96, 54, markerTitle, {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "26px",
      fontStyle: "bold",
      color: "rgba(255,255,255,0.82)",
      stroke: "#06080d",
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(2);

    this.add.text(96, 82, markerSubtitle, {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "15px",
      color: "rgba(180,195,228,0.8)",
      stroke: "#06080d",
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(2);

    this.drawRoomComposition(roomLayout);

    const theme = roomLayout.theme ?? "rampart";
    if (theme === "ash") {
      this.drawAshGateSetPiece(roomLayout);
    } else if (theme === "galleries") {
      this.drawGalleriesSetPiece(roomLayout);
    } else if (theme === "boss") {
      this.drawEclipseThroneSetPiece(roomLayout);
    } else {
      this.drawRampartSetPiece(roomLayout);
    }
  }

  drawRoomComposition(roomLayout) {
    const platforms = roomLayout.platforms ?? [];
    const walls = roomLayout.walls ?? [];
    const hazards = roomLayout.hazards ?? [];
    const shadowPlatforms = roomLayout.shadowPlatforms ?? [];
    const isAsh = roomLayout.theme === "ash";

    for (const rect of platforms) {
      this.drawStonePlatform(rect, isAsh);
    }
    for (const rect of walls) {
      this.drawStoneWall(rect, isAsh);
    }
    for (const rect of shadowPlatforms) {
      this.drawShadowBridge(rect, isAsh);
    }
    for (const rect of hazards) {
      if (this.isHazardActive(rect)) {
        this.drawHazardBed(rect, roomLayout.theme);
      }
    }

    for (const marker of roomLayout.pickupMarkers ?? []) {
      if (this.isPickupActive(marker)) {
        this.drawPickupMarker(marker.x, marker.y, marker.label, marker.kind);
      }
    }
    for (const marker of roomLayout.secretMarkers ?? []) {
      this.drawPickupMarker(marker.x, marker.y, marker.label, marker.kind ?? "secret");
    }
    if (roomLayout.gateMarker && this.isGateActive()) {
      const { x, y, w, h } = roomLayout.gateMarker;
      this.drawGateLandmark(x, y, w, h, true);
    }
    if (roomLayout.barrierMarker && this.isBarrierActive()) {
      const { x, y, w, h } = roomLayout.barrierMarker;
      this.drawBarrierLandmark(x, y, w, h);
    }
    for (const marker of roomLayout.exitMarkers ?? []) {
      this.drawExitShrine(marker.x, marker.y, marker.w, marker.h, marker.label);
    }
    for (const checkpoint of roomLayout.checkpoints ?? []) {
      this.drawShrine(checkpoint.x, checkpoint.y, isAsh);
    }
  }

  drawRampartSetPiece(roomLayout = {}) {
    // Room A: start shrine area (matches webjs drawRoomAStartShrine)
    this.drawRootCluster(110, 615, 90, false);
    this.drawLantern(310, 482, 0xf0d6a1, 0.16);
    const pillar = this.add.graphics().setDepth(0);
    pillar.fillStyle(0x181828, 0.62);
    pillar.beginPath();
    pillar.moveTo(74, 620);
    pillar.lineTo(98, 520);
    pillar.lineTo(142, 520);
    pillar.lineTo(170, 620);
    pillar.closePath();
    pillar.fillPath();
    pillar.fillStyle(0xe6eeff, 0.08);
    pillar.fillRect(108, 542, 24, 34);

    // Room B: Dash Core arch area (matches webjs drawRoomBDashGateSet)
    const arch = this.add.graphics().setDepth(0);
    arch.fillStyle(0x382c40, 0.64);
    arch.fillRect(820, 504, 190, 126);
    arch.fillCircle(915, 504, 95);
    arch.fillStyle(0x0b0e16, 0.72);
    arch.fillRect(854, 526, 122, 104);

    const chain = this.add.graphics().setDepth(1);
    chain.lineStyle(2, 0xd7c49d, 0.18);
    chain.beginPath();
    chain.moveTo(924, 304);
    chain.lineTo(924, 454);
    chain.strokePath();
    for (let cy = 320; cy < 454; cy += 16) {
      this.add.ellipse(924, cy, 8, 12, 0xb7a37d, 0.18).setDepth(1);
    }

    this.drawLantern(924, 454, 0xefcf9c, 0.16);

    // Eclipse brazier at x=680 (matches webjs drawEclipseBraziers)
    this.drawEclipseBrazier(680, 586);

    // Chain curtain cluster at x=560 (matches webjs drawChainCurtains)
    this.drawChainCurtainCluster(560, 60, 120, false);

    if ((roomLayout.checkpoints ?? []).length === 0) {
      this.drawShrine(120, 540, false);
    }
  }

  drawAshGateSetPiece(roomLayout = {}) {
    // Broken columns across the room (matches webjs drawRoomCEnemyHall, room-relative positions)
    for (const cx of [220, 540, 860, 1180]) {
      this.drawBrokenColumn(cx, 446, 30, 174);
    }

    // Root cluster near the barrier approach (matches webjs drawRoomCEnemyHall)
    this.drawRootCluster(860, 620, 320, true);

    // Eclipse braziers (matches webjs drawEclipseBraziers, room-relative)
    this.drawEclipseBrazier(40, 586);
    this.drawEclipseBrazier(1080, 586);

    // Chain curtain cluster (matches webjs drawChainCurtains, room-relative)
    this.drawChainCurtainCluster(320, 40, 160, true);

    if (!roomLayout.barrierMarker && this.isBarrierActive()) {
      this.drawBarrierLandmark(1000, 520, 40, 100);
    }
  }

  drawGalleriesSetPiece(roomLayout = {}) {
    // Entry archway from ash-gate boundary (webjs drawRoomDExitSanctum)
    // World 2480, room-local -80 — draw from x=-80, Phaser clips off-left naturally
    this.drawArchway(-80, 364, 340, 256, 0x28223c, 0.80);

    // Lantern on visible side of entry (webjs drawLantern(2760) → room-local 200)
    this.drawLantern(200, 348, 0xefcf9c, 0.15);

    // Root tendrils at room floor entry (webjs drawRoomDExitSanctum → room-local 80)
    this.drawRootCluster(80, 620, 240, false);

    // Faint horizontal ledge-detail line (webjs ctx.fillRect(2880,408,136,8) → room-local 320)
    const detail = this.add.graphics().setDepth(1);
    detail.fillStyle(0xffffff, 0.04);
    detail.fillRect(320, 408, 136, 8);

    // Chain curtains (webjs drawChainCurtains at world 2600 → room-local 40)
    this.drawChainCurtainCluster(40, 50, 180, false);
  }

  drawEclipseThroneSetPiece(_roomLayout = {}) {
    // Boss arena archway (webjs drawBossShrineArena: drawArchway(3440, 320, 440, 300) → room-local x=20)
    this.drawArchway(20, 320, 440, 300, 0x1c1c34, 0.88);

    // Flanking broken columns (webjs: 3480→60, 3770→350 room-local)
    this.drawBrokenColumn(60, 392, 36, 228);
    this.drawBrokenColumn(350, 386, 36, 234);

    // Arena lanterns (webjs: 3570→150, 3720→300 room-local)
    this.drawLantern(150, 350, 0xf0d6a1, 0.14);
    this.drawLantern(300, 350, 0xf0d6a1, 0.14);

    // Eclipse brazier (webjs: 3560→140 room-local; only one brazier in eclipse-throne range)
    this.drawEclipseBrazier(140, 586);

    // Chain curtains (webjs: world 3520 → room-local 100)
    this.drawChainCurtainCluster(100, 40, 160, false);

    // Boss arena semicircle floor markers (webjs drawBossShrineArena arc center 3640 → room-local 220)
    const arenaG = this.add.graphics().setDepth(1);
    arenaG.lineStyle(3, 0xf2d49d, 0.24);
    arenaG.beginPath();
    arenaG.arc(220, 604, 132, Math.PI, Math.PI * 2, false, 32);
    arenaG.strokePath();
    arenaG.beginPath();
    arenaG.arc(220, 604, 62, Math.PI, Math.PI * 2, false, 32);
    arenaG.strokePath();
  }

  drawArchway(x, y, w, h, colorHex, alpha) {
    // Matches webjs drawArchway(x, y, w, h, color):
    //   fillRect(x, y+34, w, h-34)  → rect body
    //   arc(x+w/2, y+34, w/2, PI, 0) → semicircle cap
    //   inner dark fillRect(x+34, y+56, w-68, h-56)
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(colorHex, alpha);
    g.fillRect(x, y + 34, w, h - 34);
    g.fillCircle(x + w * 0.5, y + 34, w * 0.5);
    g.fillStyle(0x0c0f18, 0.82);
    g.fillRect(x + 34, y + 56, w - 68, h - 56);
  }

  drawRootCluster(x, y, width, isAsh) {
    const color = isAsh ? 0x8472a4 : 0x7e6ca6;
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(4, color, 0.24);
    for (let i = 0; i < 6; i++) {
      const sx = x + i * (width / 5);
      const midX = sx - 10 + i * 2;
      const midY = y - 28 - (i % 2) * 10;
      const ex = sx + 10 - i * 2;
      const ey = y - 54 - i * 6;
      g.beginPath();
      g.moveTo(sx, y);
      g.lineTo(midX, midY);
      g.lineTo(ex, ey);
      g.strokePath();
    }
  }

  drawBrokenColumn(x, y, w, h) {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x22262a, 0.46);
    g.fillRect(x, y, w, h);
    g.fillStyle(0x616c7c, 0.18);
    g.fillRect(x + 5, y + 10, 5, h - 18);
    g.fillRect(x + w - 10, y + 10, 5, h - 18);
    g.fillStyle(0x22262a, 0.46);
    g.beginPath();
    g.moveTo(x - 4, y + 18);
    g.lineTo(x + w * 0.5, y - 12);
    g.lineTo(x + w + 6, y + 16);
    g.closePath();
    g.fillPath();
  }

  drawEclipseBrazier(x, y) {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x1c1c2a, 0.92);
    g.fillRect(x, y, 18, 28);
    g.fillStyle(0xf0c885, 0.88);
    g.beginPath();
    g.moveTo(x + 9, y - 18);
    g.lineTo(x + 3, y + 4);
    g.lineTo(x + 15, y + 4);
    g.closePath();
    g.fillPath();
  }

  drawChainCurtainCluster(x, y, width, isAsh) {
    const color = isAsh ? 0x8074c0 : 0xd7c7a8;
    const alpha = 0.16;
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(1.5, color, alpha);
    for (let i = 0; i < 6; i++) {
      const px = x + i * (width / 6) + 8;
      const len = 40 + (i % 3) * 18;
      for (let j = 0; j < len; j += 8) {
        const offsetX = Math.sin(j * 0.08) * 3;
        g.beginPath();
        g.moveTo(px + offsetX, y + j);
        g.lineTo(px + offsetX, y + j + 5);
        g.strokePath();
      }
    }
  }

  drawStonePlatform(rect, isAsh) {
    const bodyColor = isAsh ? 0x42312d : 0x293446;
    const capColor = isAsh ? 0x8b6b58 : 0x7f92b8;
    const undersideColor = isAsh ? 0x1c120f : 0x121a29;
    const crackColor = isAsh ? 0x110807 : 0x0b1018;

    const body = this.add.graphics().setDepth(1);
    body.fillStyle(bodyColor, 0.94);
    body.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, Math.min(8, rect.h * 0.25));
    body.fillStyle(capColor, 0.65);
    body.fillRect(rect.x, rect.y, rect.w, Math.max(4, Math.min(10, rect.h * 0.18)));
    body.fillStyle(undersideColor, 0.55);
    body.fillRect(rect.x, rect.y + rect.h - Math.max(6, rect.h * 0.14), rect.w, Math.max(6, rect.h * 0.14));

    const detail = this.add.graphics().setDepth(2);
    detail.lineStyle(2, crackColor, 0.32);
    const crackCount = Math.max(1, Math.floor(rect.w / 120));
    for (let i = 0; i < crackCount; i += 1) {
      const startX = rect.x + 24 + i * Math.max(54, rect.w / crackCount);
      detail.beginPath();
      detail.moveTo(startX, rect.y + 6);
      detail.lineTo(startX - 8, rect.y + rect.h * 0.35);
      detail.lineTo(startX + 6, rect.y + rect.h * 0.62);
      detail.strokePath();
    }
  }

  drawStoneWall(rect, isAsh) {
    const wall = this.add.graphics().setDepth(1);
    wall.fillStyle(isAsh ? 0x372521 : 0x202938, 0.9);
    wall.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 6);
    wall.fillStyle(isAsh ? 0x8a654d : 0x8090b2, 0.42);
    wall.fillRect(rect.x, rect.y, rect.w, 8);

    const ribs = this.add.graphics().setDepth(2);
    ribs.fillStyle(isAsh ? 0x1d1210 : 0x101620, 0.45);
    for (let y = rect.y + 24; y < rect.y + rect.h - 12; y += 34) {
      ribs.fillRect(rect.x + 4, y, rect.w - 8, 6);
    }
  }

  drawShadowBridge(rect, isAsh) {
    const bridge = this.add.graphics().setDepth(1);
    bridge.fillStyle(isAsh ? 0x6f7cb6 : 0x8190e0, 0.18);
    bridge.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 6);
    bridge.lineStyle(2, isAsh ? 0xc4c8ff : 0xd7dcff, 0.34);
    bridge.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 6);

    for (let x = rect.x + 10; x < rect.x + rect.w - 8; x += 18) {
      this.add.ellipse(x, rect.y + rect.h * 0.5, 8, rect.h + 4, 0xe9ecff, 0.08).setDepth(1);
    }
  }

  drawHazardBed(rect, themeName) {
    const isAsh = themeName === "ash";
    const base = this.add.graphics().setDepth(2);
    base.fillStyle(isAsh ? 0x2b2220 : 0x202938, 0.92);
    base.fillRect(rect.x - 4, rect.y + rect.h - 4, rect.w + 8, 8);

    const spikes = this.add.graphics().setDepth(3);
    const count = Math.max(2, Math.floor(rect.w / 12));
    for (let i = 0; i < count; i += 1) {
      const px = rect.x + i * (rect.w / count);
      const spikeWidth = rect.w / count;
      spikes.fillStyle(this.swapSystem?.getPhase?.() === SHADOW_SWAP_PHASES.SHADOW ? 0xa1b4ff : 0xe0f2ff, 0.84);
      spikes.beginPath();
      spikes.moveTo(px, rect.y + rect.h);
      spikes.lineTo(px + spikeWidth * 0.18, rect.y + rect.h * 0.68);
      spikes.lineTo(px + spikeWidth * 0.5, rect.y);
      spikes.lineTo(px + spikeWidth * 0.82, rect.y + rect.h * 0.68);
      spikes.lineTo(px + spikeWidth, rect.y + rect.h);
      spikes.closePath();
      spikes.fillPath();
    }
  }

  drawLantern(x, y, color, glowAlpha) {
    const glow = this.add.circle(x, y, 42, color, glowAlpha).setDepth(1);
    const body = this.add.graphics().setDepth(2);
    body.fillStyle(color, 1);
    body.fillRoundedRect(x - 8, y - 10, 16, 20, 4);
    body.lineStyle(2, 0x231813, 0.75);
    body.strokeRoundedRect(x - 8, y - 10, 16, 20, 4);
    return { glow, body };
  }

  drawShrine(x, y, ashVariant) {
    const glowColor = ashVariant ? 0xe9d6aa : 0xc6d0e4;
    this.add.circle(x + 14, y + 18, ashVariant ? 38 : 32, glowColor, ashVariant ? 0.16 : 0.1).setDepth(1);

    const shrine = this.add.graphics().setDepth(2);
    shrine.fillStyle(0x202636, 0.92);
    shrine.fillRoundedRect(x, y, 28, 72, 8);
    shrine.fillStyle(ashVariant ? 0x9f6844 : 0x8ea1ff, 0.22);
    shrine.fillRoundedRect(x + 6, y + 10, 16, 52, 6);
    shrine.lineStyle(2, ashVariant ? 0xe9d6aa : 0xd8f0db, 0.58);
    shrine.strokeRoundedRect(x, y, 28, 72, 8);
  }

  drawPickupMarker(x, y, label, kind) {
    const color = kind === "dash" ? 0xf4d87c : kind === "weapon" ? 0x9be8ff : 0xf6efbe;
    this.add.circle(x + 14, y + 14, 36, color, 0.16).setDepth(2);
    const relic = this.add.graphics().setDepth(3);
    relic.fillStyle(color, 0.92);
    relic.fillRoundedRect(x + 6, y + 2, 16, 24, 4);
    relic.lineStyle(2, 0x201914, 0.72);
    relic.strokeRoundedRect(x + 6, y + 2, 16, 24, 4);
    this.add.text(x + 14, y - 16, label, {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "11px",
      color: "#d6ddef",
      stroke: "#08090d",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);
  }

  drawGateLandmark(x, y, w, h, active = true) {
    const gate = this.add.graphics().setDepth(1);
    gate.fillStyle(active ? 0x7d6c52 : 0x2f2527, active ? 0.74 : 0.28);
    gate.fillRoundedRect(x, y, w, h, 8);
    gate.lineStyle(3, active ? 0xd9c28e : 0x8bf8c9, active ? 0.34 : 0.72);
    gate.strokeRoundedRect(x, y, w, h, 8);
    if (active) {
      gate.fillStyle(0xf4d87c, 0.9);
      gate.beginPath();
      gate.moveTo(x + w * 0.5, y + 12);
      gate.lineTo(x + w * 0.75, y + 30);
      gate.lineTo(x + w * 0.52, y + 30);
      gate.lineTo(x + w * 0.62, y + 52);
      gate.closePath();
      gate.fillPath();
    }
  }

  drawBarrierLandmark(x, y, w, h) {
    const barrierGlow = this.add.graphics().setDepth(1);
    barrierGlow.fillStyle(0xff9a63, 0.14);
    barrierGlow.fillEllipse(x + w * 0.5, y + h * 0.35, 180, 220);

    const barrier = this.add.graphics().setDepth(2);
    barrier.fillStyle(0x110a09, 0.92);
    barrier.beginPath();
    barrier.moveTo(x + 3, y + h);
    barrier.lineTo(x + 8, y + 22);
    barrier.lineTo(x + 16, y + 3);
    barrier.lineTo(x + 23, y + 18);
    barrier.lineTo(x + 31, y + 2);
    barrier.lineTo(x + 36, y + 24);
    barrier.lineTo(x + 37, y + h);
    barrier.closePath();
    barrier.fillPath();

    for (let i = 0; i < 4; i += 1) {
      const emberX = x + 8 + i * 7;
      const emberY = y + 14 + (i % 2) * 8;
      this.add.circle(emberX, emberY, 6, 0xffb47d, 0.08).setDepth(1);
      this.add.circle(emberX, emberY, 1.8 + (i % 2), 0xffd38f, 0.85).setDepth(3);
    }
  }

  drawExitShrine(x, y, w, h, label = "Exit Shrine") {
    this.add.circle(x + w * 0.5, y + h * 0.4, 96, 0xd8f0db, 0.18).setDepth(1);
    const arch = this.add.graphics().setDepth(2);
    arch.fillStyle(0x121624, 0.88);
    arch.fillRoundedRect(x - 24, y - 56, w + 48, h + 92, 18);
    arch.fillStyle(0x0a0d14, 0.88);
    arch.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 12);
    arch.lineStyle(4, 0x9ff7d8, 0.92);
    arch.strokeRoundedRect(x, y, w, h, 12);
    this.add.text(x + w * 0.5, y - 20, label, {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "12px",
      color: "#d8f0db",
      stroke: "#090b10",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);
  }

  startRun() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.ui.hideStartOverlay(this.getRoomEntryObjective());
  }

  applyWorldBounds(roomLayout) {
    const worldWidth = roomLayout?.worldWidth ?? 1280;
    const worldHeight = roomLayout?.worldHeight ?? 720;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
  }

  toggleRoomMode() {
    const isTest = this.roomMode === "test" && !this.roomId;
    const nextMode = isTest ? "presentation" : "test";
    window.localStorage.setItem(ROOM_MODE_STORAGE_KEY, nextMode);
    this.scene.restart({ roomMode: nextMode, autoStart: this.isStarted });
  }

  getRoomEntryObjective() {
    const roomId = this.roomId ?? "outer-rampart";
    if (!this.abilities.has(ABILITY_IDS.DASH)) {
      return "Reach the Dash Core";
    }
    if (this.isGateActive()) {
      return "Dash through the sealed gate";
    }
    if (roomId === "ash-gate" && this.isBarrierActive()) {
      return "Use Fire and strike the ash barrier";
    }
    if (roomId === "umbral-galleries" && this.weaponSystem.getStageIndex() <= 0) {
      return "Claim the Umbral Fang";
    }
    if (roomId === "eclipse-throne" && !this.progressFlags.bossDefeated) {
      return "Defeat the Eclipse Lord";
    }
    if (roomId === "eclipse-throne" && this.progressFlags.bossDefeated) {
      return "Reach the exit shrine";
    }
    if ((this.roomLayout.exits?.length ?? 0) > 0) {
      return `Explore ${this.roomLayout.label} and push through the next gate.`;
    }
    return `Hold your ground in ${this.roomLayout.label}.`;
  }

  getCurrentSpawnId() {
    return this.checkpointSystem.getActive()?.spawnId ?? this.spawnId ?? "default";
  }

  restoreSaveState(savedData) {
    if (!savedData) {
      return;
    }

    this.player.setHealth(savedData.playerHp ?? this.player.getMaxHealth());
    this.applyMovementAbilityLoadout();
    this.elementSystem.setElement(savedData.element);
    this.checkpointSystem.restoreActive(savedData.checkpointId, this.roomLayout.checkpoints ?? []);
  }

  buildRuntimeSave() {
    return {
      roomId: this.roomId ?? "outer-rampart",
      spawnId: this.getCurrentSpawnId(),
      playerHp: this.player.getHealth(),
      element: this.elementSystem.getElement(),
      unlockedAbilities: this.abilities.listUnlocked(),
      weaponStage: this.weaponSystem.getStageIndex(),
      visitedRooms: this.checkpointSystem.getVisitedRooms(),
      checkpointId: this.checkpointSystem.getActive()?.id ?? null,
      worldFlags: { ...this.progressFlags },
    };
  }

  applyMovementAbilityLoadout() {
    this.player.canDash = this.abilities.has(ABILITY_IDS.DASH);
    this.player.canWallJump = this.abilities.has(ABILITY_IDS.WALL_JUMP);
    this.player.canDoubleJump = this.abilities.has(ABILITY_IDS.DOUBLE_JUMP);
  }

  currentWeaponStageIndex() {
    return this.weaponSystem?.getStageIndex?.() ?? this.initialWeaponStage ?? 0;
  }

  isPickupActive(marker) {
    if (marker.reward === "dash") {
      return !this.abilities.has(ABILITY_IDS.DASH);
    }
    if (marker.reward === "weapon") {
      return this.currentWeaponStageIndex() <= 0;
    }
    return true;
  }

  isGateActive() {
    return !this.abilities.has(ABILITY_IDS.DASH);
  }

  isBarrierActive() {
    return !this.progressFlags.barrierCleared;
  }

  isHazardActive(hazard) {
    if (!hazard?.world || hazard.world === "Both") {
      return true;
    }
    const phase = this.swapSystem?.getPhase?.() ?? SHADOW_SWAP_PHASES.LIGHT;
    return hazard.world === phase;
  }

  createDynamicBlockers() {
    this.blockers = this.physics.add.staticGroup();
    this.activeBlockers = [];
    for (const blocker of this.roomLayout.blockers ?? []) {
      const active = blocker.kind === "gate" ? this.isGateActive() : blocker.kind === "barrier" ? this.isBarrierActive() : true;
      if (!active) {
        continue;
      }
      const block = this.blockers.create(blocker.x + blocker.w * 0.5, blocker.y + blocker.h * 0.5, "solid-block");
      block.setDisplaySize(blocker.w, blocker.h);
      block.setVisible(false);
      block.refreshBody();
      this.activeBlockers.push({ ...blocker, sprite: block });
    }
    this.physics.add.collider(this.player.sprite, this.blockers);
    for (const enemy of this.enemies) {
      this.physics.add.collider(enemy.sprite, this.blockers);
    }
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
      saveManager.save(this.buildRuntimeSave());
      this.audio.onSave();
      this.statusText.setText("Saved");
      this.ui.setObjective("Game saved.");
      this._objectiveOverride = 2000;
    }
    if (Phaser.Input.Keyboard.JustDown(this.loadKey)) {
      const saved = saveManager.load();
      if (saved) {
        this.scene.restart({
          roomId: saved.roomId ?? "outer-rampart",
          spawnId: saved.spawnId ?? "default",
          autoStart: true,
          saveData: saved,
        });
        return;
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
      if (!this.abilities.has(ABILITY_IDS.SHADOW_SWAP)) {
        this.statusText.setText("Shadow Swap still sealed");
        this.ui.setObjective("Shadow Swap is not unlocked yet.");
        this._objectiveOverride = 1400;
      } else {
        const result = this.swapSystem.requestSwap({ now: this.time.now });
        if (result.swapped) {
          this.audio.onSwap();
        }
      }
    }

    // Phase 17: element cycle
    if (this.inputMap.wasPressed("element")) {
      const nextElement = this.elementSystem.cycleNext();
      this.audio.onElement();
      this.ui.setObjective(`Element shifted to ${nextElement}.`);
      this._objectiveOverride = 1200;
    }

    this.player.update(delta);
    for (const cue of this.player.consumeAudioCues()) {
      if (cue === "jump") this.audio.onJump();
      if (cue === "dash") this.audio.onDash();
      if (cue === "attack") this.audio.onAttack();
    }
    const landingImpact = this.player.consumeLandingImpact();
    this.impactFeedback.triggerLanding(landingImpact);
    if (landingImpact) {
      this.audio.onLand();
    }

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

    const activeSpawnId = this.getCurrentSpawnId();
    const spawnPoint = this.roomLayout.spawns?.[activeSpawnId] ?? this.roomLayout.spawn;

    for (const marker of this.roomLayout.pickupMarkers ?? []) {
      if (!this.isPickupActive(marker)) {
        continue;
      }
      if (overlapsRect(this.player.sprite.body, marker)) {
        if (marker.reward === "dash") {
          this.abilities.unlock(ABILITY_IDS.DASH);
          this.applyMovementAbilityLoadout();
          this.statusText.setText("Dash Core recovered");
          this.ui.setObjective("Dash unlocked. Break through the sealed gate.");
          this._objectiveOverride = 2200;
        } else if (marker.reward === "weapon") {
          this.weaponSystem.upgradeToNext();
          this.statusText.setText("Umbral Fang claimed");
          this.ui.setObjective("The Umbral Fang answers your hand.");
          this._objectiveOverride = 2200;
        }
        this.scene.restart({
          roomId: this.roomId,
          spawnId: activeSpawnId,
          autoStart: true,
          saveData: this.buildRuntimeSave(),
        });
        return;
      }
    }

    for (const hazard of this.roomLayout.hazards ?? []) {
      if (!this.isHazardActive(hazard) || this.player.isInvulnerable()) {
        continue;
      }
      if (overlapsRect(this.player.sprite.body, hazard)) {
        this.player.applyDamage({ damage: hazard.damage ?? 1, sourceX: hazard.x + hazard.w * 0.5 });
        this.statusText.setText("Spikes tore through the vessel");
        break;
      }
    }

    if (this.player.consumeRespawnRequest()) {
      this.player.resetTo(spawnPoint.x, spawnPoint.y);
      this.ui.setObjective("Returned to last rest point.");
      this._objectiveOverride = 2000;
      this.statusText.setText("Vessel restored at the gate");
    }

    // Phase 22: NPC update / dialogue
    const interactJustDown = Phaser.Input.Keyboard.JustDown(this.activateKey);
    let dialogueTriggered = false;
    if (this.dialogueRenderer.isActive()) {
      if (interactJustDown || Phaser.Input.Keyboard.JustDown(this.dialogueAdvanceKey)) {
        this.dialogueRenderer.advance();
      }
    } else {
      for (const npc of this.npcs ?? []) {
        const interaction = npc.update(this.player, interactJustDown);
        if (interaction?.dialogueId && DIALOGUE[interaction.dialogueId]) {
          dialogueTriggered = true;
          this.audio.onDialogue();
          this.dialogueRenderer.start(DIALOGUE[interaction.dialogueId], {
            speaker: interaction.label,
            doneCb: () => {
              this.ui.setObjective(`${interaction.label} heard. Press onward.`);
              this._objectiveOverride = 1500;
            }
          });
          this.ui.setObjective(`Speaking with ${interaction.label}.`);
          this._objectiveOverride = 1500;
          break;
        }
      }
    }

    // Phase 21: checkpoint activation (Z key)
    const cpHit = !dialogueTriggered && !this.dialogueRenderer.isActive() ? this.checkpointSystem.check(
      this.player,
      this.roomLayout.checkpoints ?? [],
      Phaser.Input.Keyboard.JustDown(this.activateKey)
    ) : null;
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
    if (DEBUG) {
      this.playerStateText.setText(
        this.player.isDead()
          ? "Vessel HP 0/5 | rebuilding..."
          : `Vessel HP ${this.player.getHealth()}/${this.player.getMaxHealth()}${this.player.isInvulnerable() ? " | invulnerable" : ""}`
      );
    }

    if (this.player.sprite.y > 900) {
      this.player.resetTo(spawnPoint.x, spawnPoint.y);
      this.ui.setObjective("Returned to last rest point.");
      this._objectiveOverride = 2000;
      return;
    }

    // Phase 11: room transitions
    if (!this.transitioning) {
      const exit = this.transitionSystem.check(this.player, this.roomLayout.exits ?? [], this.time.now);
      if (exit) {
        this.transitioning = true;
        this.ui.setObjective(`Crossing into ${exit.targetRoom.replace(/-/g, " ")}...`);
        this._objectiveOverride = 600;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.restart({ roomId: exit.targetRoom, spawnId: exit.spawnId, autoStart: true });
        });
      }
    }

    if (!(this._objectiveOverride > 0)) {
      this.ui.setObjective(
        this.player.wallSliding ? "Wall slide" : this.getRoomEntryObjective()
      );
    }
    this._objectiveOverride = Math.max(0, (this._objectiveOverride ?? 0) - delta);

    if (this.progressFlags.bossDefeated && !this.stageCleared) {
      const exitMarker = (this.roomLayout.exitMarkers ?? [])[0];
      if (exitMarker && overlapsRect(this.player.sprite.body, exitMarker)) {
        this.stageCleared = true;
        this.statusText.setText("Vertical slice cleared");
        this.ui.setObjective("Vertical slice cleared.");
        this._objectiveOverride = 999999;
      }
    }
  }

  // Phase 15/16: apply visual + physics changes on world swap
  _applyShadowPhase(phase) {
    const isShadow = phase === SHADOW_SWAP_PHASES.SHADOW;
    this.ui.setWorldPhase(isShadow ? "Shadow" : "Light");

    for (const enemy of this.enemies ?? []) {
      enemy.onWorldPhaseChanged?.(phase);
    }

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
        const reaction = getElementReaction(this.elementSystem.getElement(), enemy.stats?.weakness);
        const rawDamage = this.weaponSystem.applyDamage(getAttackDamage(profile));
        const finalDamage = reaction.multiplier > 1 ? Math.ceil(rawDamage * reaction.multiplier) : rawDamage;
        return buildHitEvent(profile, this.player.facing, finalDamage);
      }
    });

    for (const { target: enemy, hit, result } of enemyHits) {
      if (profile.type === "downslash") {
        this.player.sprite.body.setVelocityY(-profile.bounceStrength);
      }

      const shakeMs = profile.finisher ? 90 : profile.hitTag === "heavy" ? 70 : 50;
      this.cameras.main.shake(shakeMs, 0.003);
      const reaction = getElementReaction(this.elementSystem.getElement(), enemy.stats?.weakness);
      const reactionLabel = reaction.label ? ` [${reaction.label}]` : "";
      if (reaction.isWeakness && enemy.isAlive()) {
        this.audio.onHitWeak();
        enemy.sprite.setTintFill(reaction.color ?? ELEMENT_COLORS.None);
        this.time.delayedCall(90, () => {
          if (enemy.isAlive() && enemy.hurtFlashTimer <= 0) {
            enemy.sprite.clearTint();
            enemy.sprite.setTint(enemy.stats.tint);
          }
        });
      } else {
        this.audio.onHit();
      }
      this.statusText.setText(
        result?.defeated
          ? `${enemy.label} defeated by ${profile.id}${reactionLabel}`
          : `${profile.id} hit ${enemy.label} for ${hit.damage}${reactionLabel}`
      );
      if (result?.defeated && enemy.stats?.boss) {
        this.progressFlags.bossDefeated = true;
        this.ui.setObjective("Reach the exit shrine.");
        this._objectiveOverride = 3200;
      }
    }

    if (this.isBarrierActive()) {
      const barrier = this.roomLayout.barrierMarker;
      if (barrier && overlapsRect(attackBox, barrier)) {
        if (this.elementSystem.getElement() === "Fire") {
          this.progressFlags.barrierCleared = true;
          this.statusText.setText("Ash barrier burned away");
          this.scene.restart({
            roomId: this.roomId,
            spawnId: this.spawnId,
            autoStart: true,
            saveData: this.buildRuntimeSave(),
          });
          return;
        }
        this.statusText.setText("Fire is needed here");
      }
    }
  }
}
