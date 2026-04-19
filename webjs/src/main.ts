// ============================================================================
// main.ts — Shadow Shift game bootstrap and orchestration layer
//
// SOLID design notes:
//  SRP : this file wires modules together and hosts game-loop code that has
//        not yet warranted its own module (combat, physics, update loop).
//  OCP : adding a new level only requires a new LevelDefinition value — no
//        changes to any function here.
//  DIP : audio, rendering, AI, and persistence are all passed inward; no
//        module imported here imports back from main.ts.
// ============================================================================

import { BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT, MAX_PARTICLES, MAX_SLASH_EFFECTS } from "./engine/constants";
import { clamp } from "./engine/utils";
import { aabbOverlap, collectWorldSolids, resolveHorizontal, resolveVertical, probeOverlap, createRect } from "./engine/collision";
import { createEntityRegistry } from "./engine/entities";
import { BASE_MOVEMENT_TUNING, getMovementTuning, resolveHorizontalVelocity } from "./engine/movement";
import { createHitbox, createHurtbox, getEnemyImpactTuning, getImpactPowerForHit, getReactionTypeFromHit, getReactionDuration } from "./engine/combat";
import { generateRoomChain, PROCEDURAL_ROOM_TEMPLATES } from "./engine/layout";
import { resolveElementalHit, applyEnemyElementalStatus, updateEnemyElementalState, getEnemyElementSpeedMultiplier, getHazardContactProfile, applyEnvironmentElementReaction, updateEnvironmentElementState } from "./engine/elements";
import { isWorldEntityActive, getEnemyWorldModifier, applyWorldSwapReactiveState } from "./engine/shadow";
import { ensureReactiveState, setReactiveFlag, getReactiveFlag, updateReactiveTimers, triggerReactiveObject } from "./engine/reactivity";
import { ensurePuzzleRuntime, triggerPuzzleNode, updatePuzzleState, isPuzzleActive } from "./engine/puzzles";
import { getProgressionState, meetsRequirements } from "./engine/world";
import { createStateMachine } from "./engine/state-machine";
import { createRuntime } from "./engine/runtime";

// --- SOLID modules ---
import { createGameState } from "./game/state";
import { ECLIPSE_KEEP_LEVEL } from "./level/eclipse-keep";
import { saveProgress, applyPersistedProgress } from "./save/persist";
import { createAudioEngine } from "./audio/audio";
import { createRenderer } from "./render/renderer";
import {
  initializeEnemyRuntime,
  createTimedStateDefinitions,
  updateEnemyBehavior,
  hasBossAlive,
  isBulwarkGuardingFront,
  beginEnemyStagger,
  getEnemyContactCooldown
} from "./game/enemy-ai";

// ---------------------------------------------------------------------------
// Canvas and HUD elements
// ---------------------------------------------------------------------------

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
canvas.width = BASE_CANVAS_WIDTH;
canvas.height = BASE_CANVAS_HEIGHT;
const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
ctx.imageSmoothingEnabled = true;

const hud = {
  health: document.getElementById("healthValue"),
  healthBar: document.getElementById("healthBar"),
  healthBarGhost: document.getElementById("healthBarGhost"),
  world: document.getElementById("worldValue"),
  element: document.getElementById("elementValue"),
  weapon: document.getElementById("weaponValue"),
  invulnerable: document.getElementById("invulnerableValue"),
  invulnerableToggleButton: document.getElementById("invulnerableToggleButton"),
  objective: document.getElementById("objectiveValue"),
  startOverlay: document.getElementById("startOverlay"),
  startButton: document.getElementById("startButton"),
  overlay: document.getElementById("messageOverlay"),
  deathOverlay: document.getElementById("deathOverlay"),
  deathReason: document.getElementById("deathReason"),
  retryButton: document.getElementById("retryButton"),
  restartLevelButton: document.getElementById("restartLevelButton"),
  winOverlay: document.getElementById("winOverlay"),
  winReason: document.getElementById("winReason"),
  restartWinButton: document.getElementById("restartWinButton"),
  restartLevelWinButton: document.getElementById("restartLevelWinButton"),
  touchHud: document.getElementById("touchHud")
};

// ---------------------------------------------------------------------------
// Audio engine (DIP — injected into call sites via `audio.xxx()`)
// ---------------------------------------------------------------------------

const audio = createAudioEngine();

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------

const keys = new Set<string>();
const touchState = { left: false, right: false };
const touchButtons = Array.from(document.querySelectorAll("[data-touch], [data-touch-tap]"));

function clearInputState() {
  keys.clear();
  touchState.left = false;
  touchState.right = false;
  if (typeof state !== "undefined" && state.player) {
    state.player.jumpReleased = false;
  }
  for (const button of touchButtons) {
    (button as HTMLElement).classList.remove("is-active");
  }
}

function setTouchMode(enabled: boolean) {
  document.body.classList.toggle("touch-mode", enabled);
}

window.addEventListener("keydown", (event) => {
  if (["Space", "KeyE", "KeyF", "ShiftLeft", "ShiftRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }

  if (!state.started) {
    if (["Enter", "Space"].includes(event.code)) {
      audio.ensureAudio();
      startRun();
    }
    return;
  }

  keys.add(event.code);
  audio.ensureAudio();
  handleKeyDown(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space" && state?.player) {
    state.player.jumpReleased = true;
  }
});

window.addEventListener("blur", clearInputState);
window.addEventListener("pagehide", clearInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInputState();
    audio.pauseTheme();
  } else if (state.started) {
    audio.ensureAudio();
  }
});

hud.startButton!.addEventListener("click", () => {
  audio.ensureAudio();
  startRun();
});

hud.retryButton!.addEventListener("click", () => {
  audio.ensureAudio();
  hideDeathOverlay();
  respawnFromSavedCheckpoint("The warrior rises again");
});

hud.restartLevelButton!.addEventListener("click", () => {
  audio.ensureAudio();
  restartLevelFromBeginning("The keep reshapes itself");
});

hud.restartWinButton!.addEventListener("click", () => {
  audio.ensureAudio();
  hideWinOverlay();
  respawnFromSavedCheckpoint("The warrior steps back into the ruin");
});

hud.restartLevelWinButton!.addEventListener("click", () => {
  audio.ensureAudio();
  restartLevelFromBeginning("The warrior returns to the outer gate");
});

hud.invulnerableToggleButton!.addEventListener("click", () => {
  toggleInvulnerability();
});

for (const button of document.querySelectorAll("[data-touch]")) {
  const control = (button as HTMLElement).dataset.touch!;
  const press = (event: Event) => {
    event.preventDefault();
    setTouchMode(true);
    audio.ensureAudio();
    if (!state.started) { startRun(); }
    (touchState as any)[control] = true;
    (button as HTMLElement).classList.add("is-active");
  };
  const release = (event: Event) => {
    event.preventDefault();
    (touchState as any)[control] = false;
    (button as HTMLElement).classList.remove("is-active");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

for (const button of document.querySelectorAll("[data-touch-tap]")) {
  const action = (button as HTMLElement).dataset.touchTap!;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setTouchMode(true);
    audio.ensureAudio();
    if (!state.started) { startRun(); return; }
    (button as HTMLElement).classList.add("is-active");
    handleTouchAction(action);
  });
  const clear = (event: Event) => {
    event.preventDefault();
    (button as HTMLElement).classList.remove("is-active");
  };
  button.addEventListener("pointerup", clear);
  button.addEventListener("pointercancel", clear);
  button.addEventListener("pointerleave", clear);
}

// ---------------------------------------------------------------------------
// Game state — created from the current level definition
// ---------------------------------------------------------------------------

const state = createGameState(ECLIPSE_KEEP_LEVEL);
initializeStateRuntime(state);

// persistDeps is defined here; the functions it references are function
// declarations below and are therefore hoisted into scope at this point.
const persistDeps = {
  setSavedCheckpoint,
  spawnPlayerAtCheckpoint,
  regenerateProceduralLayout,
  syncPuzzlePlatforms
};

applyPersistedProgress(state, persistDeps);
regenerateProceduralLayout(state);
syncPuzzlePlatforms(state);

// ---------------------------------------------------------------------------
// Runtime initializers
// ---------------------------------------------------------------------------

function initializeStateRuntime(targetState) {
  initializeEntityRegistry(targetState);
  initializeReactiveObjects(targetState);
  initializePuzzles(targetState);
  initializePlayerRuntime(targetState.player);
  targetState.player.maxHp = targetState.player.maxHp ?? targetState.player.hp;
  targetState.player.displayHp = targetState.player.maxHp;
  for (const enemy of targetState.enemies) {
    enemy.maxHp = enemy.maxHp ?? enemy.hp;
    enemy.displayHp = enemy.maxHp;
    enemy.reactionTimer = enemy.reactionTimer ?? 0;
    enemy.reactionType = enemy.reactionType ?? "none";
    enemy.elementalState = enemy.elementalState ?? {
      type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0
    };
    enemy.worldPhase = enemy.worldPhase ?? getEnemyWorldModifier(enemy, targetState);
    initializeEnemyRuntime(enemy);
  }
  applyWorldSwapReactiveState(targetState);
}

function initializeEntityRegistry(targetState) {
  targetState.entities = createEntityRegistry();

  targetState.entities.register("pickup", targetState.pickups.dash, {
    trigger: true,
    reward: "Dash"
  });
  targetState.entities.register("pickup", targetState.pickups.weapon, {
    trigger: true,
    reward: "WeaponStage"
  });

  for (const checkpoint of targetState.checkpoints) {
    targetState.entities.register("checkpoint", checkpoint, {
      trigger: true,
      checkpointId: checkpoint.id
    });
  }

  for (const hazard of targetState.hazards ?? []) {
    targetState.entities.register("hazard", hazard, {
      damage: hazard.damage ?? 1,
      kind: hazard.kind ?? "hazard"
    });
  }

  for (const cache of targetState.secretCaches ?? []) {
    targetState.entities.register("secret", cache, {
      reward: cache.reward?.type ?? "secret"
    });
  }
}

function getReactiveObjects(targetState) {
  return [
    targetState.gate,
    targetState.barrier,
    ...(targetState.checkpoints ?? []),
    ...(targetState.secretCaches ?? [])
  ].filter(Boolean);
}

function initializeReactiveObjects(targetState) {
  for (const object of getReactiveObjects(targetState)) {
    ensureReactiveState(object);
  }
}

function getPuzzleById(targetState, puzzleId) {
  return (targetState.puzzles ?? []).find((puzzle) => puzzle.id === puzzleId) ?? null;
}

function initializePuzzles(targetState) {
  for (const puzzle of targetState.puzzles ?? []) {
    ensurePuzzleRuntime(puzzle);
  }
}

// ---------------------------------------------------------------------------
// Room management
// ---------------------------------------------------------------------------

function getRoomById(targetState, roomId) {
  return targetState.rooms.find((room) => room.id === roomId) ?? targetState.rooms[0];
}

function getRoomForX(targetState, x) {
  return targetState.rooms.find((room) => x >= room.bounds.x && x < room.bounds.x + room.bounds.w)
    ?? targetState.rooms[targetState.rooms.length - 1];
}

function exitRoom(targetState, roomId) {
  const room = getRoomById(targetState, roomId);
  targetState.activeCheckpointId = room.spawnCheckpointId ?? targetState.activeCheckpointId;
}

function enterRoom(targetState, roomId) {
  const room = getRoomById(targetState, roomId);
  targetState.currentRoomId = room.id;
  targetState.roomState.visitedRooms[room.id] = true;
  regenerateProceduralLayout(targetState);
  if (targetState === state && targetState.started && !targetState.gameWon && !targetState.isDead) {
    showMessage(`${room.label}: ${getRoomProgressionHint(targetState, room)}`, 2.1);
  }
}

function updateCurrentRoom(targetState, player) {
  const room = getRoomForX(targetState, player.x + player.w * 0.5);
  if (targetState.currentRoomId !== room.id) {
    exitRoom(targetState, targetState.currentRoomId);
    enterRoom(targetState, room.id);
    return;
  }
  targetState.currentRoomId = room.id;
}

function getCurrentRoom(targetState) {
  return getRoomById(targetState, targetState.currentRoomId);
}

function getRoomEntities(targetState, roomId) {
  return {
    pickups: Object.values(targetState.pickups).filter((pickup: any) => pickup.roomId === roomId),
    checkpoints: targetState.checkpoints.filter((checkpoint) => checkpoint.roomId === roomId),
    secrets: (targetState.secretCaches ?? []).filter((cache) => cache.roomId === roomId),
    blockers: [targetState.gate, targetState.barrier].filter((entry) => entry.roomId === roomId),
    exitZone: targetState.exitZone.roomId === roomId ? targetState.exitZone : null
  };
}

// ---------------------------------------------------------------------------
// Procedural layout
// ---------------------------------------------------------------------------

function buildProceduralLayoutSeed(targetState) {
  const progression = getProgressionState(targetState);
  return [
    targetState.levelName,
    progression.abilities.Dash ? "dash" : "no-dash",
    progression.weaponStage >= 1 ? "weapon-2" : "weapon-1",
    progression.worldFlags.barrierCleared ? "barrier-open" : "barrier-sealed",
    targetState.proceduralLayout?.rerollCount ?? 0
  ].join(":");
}

function regenerateProceduralLayout(targetState) {
  const progression = getProgressionState(targetState);
  const seed = buildProceduralLayoutSeed(targetState);
  const desiredTheme = getCurrentRoom(targetState)?.theme ?? "rampart";
  const generated = generateRoomChain(PROCEDURAL_ROOM_TEMPLATES, {
    seed,
    chainLength: 4,
    theme: desiredTheme,
    requirementState: progression,
    maxCombatDensity: progression.weaponStage >= 1 ? 3 : 2,
    preferCheckpoint: true,
    meetsRequirements: (requirements, requirementState) => {
      if (!requirements) return true;
      return meetsRequirements(requirements, targetState, { requirementState });
    }
  });

  targetState.proceduralLayout.seed = generated.seed;
  targetState.proceduralLayout.route = generated.chain;
  targetState.proceduralLayout.validation = generated.validation;
}

function syncPuzzlePlatforms(targetState) {
  for (const platform of targetState.puzzlePlatforms ?? []) {
    const puzzle = getPuzzleById(targetState, platform.sourcePuzzleId);
    platform.active = Boolean(puzzle && isPuzzleActive(puzzle));
  }
}

function setProgressionFlag(targetState, category, flagId, value = true) {
  if (!targetState.progression?.[category]) return;
  targetState.progression[category][flagId] = value;
}

// ---------------------------------------------------------------------------
// Progression routing (OCP: routes come from the level definition, no
// hard-coded list here — add a new level, get new routes automatically)
// ---------------------------------------------------------------------------

function getCurrentProgressionRoute(targetState) {
  return (targetState.progressionRoutes as any[]).find(
    (route) => route.kind === "main" && route.isAvailable(targetState)
  ) ?? null;
}

function getAvailableOptionalRoutes(targetState) {
  return (targetState.progressionRoutes as any[]).filter(
    (route) => route.kind === "optional" && route.isAvailable(targetState)
  );
}

function getRoomProgressionHint(targetState, room) {
  const mainRoute = getCurrentProgressionRoute(targetState);
  if (mainRoute?.roomId === room.id) return mainRoute.objective;

  const optionalRoute = getAvailableOptionalRoutes(targetState).find((route) => route.roomId === room.id);
  if (optionalRoute) return optionalRoute.summary;

  return room.objectiveHint ?? room.revisitHint ?? "Press onward through the keep";
}

function announceProgressionRoute(targetState, force = false) {
  const route = getCurrentProgressionRoute(targetState);
  if (!route) return;

  if (!force && targetState.routeState.lastAnnouncedRouteId === route.id) return;

  targetState.routeState.lastAnnouncedRouteId = route.id;
  if (targetState === state && targetState.started && !targetState.gameWon && !targetState.isDead) {
    showMessage(route.summary, 2.8);
  }
}

// ---------------------------------------------------------------------------
// Player runtime
// ---------------------------------------------------------------------------

function initializePlayerRuntime(player) {
  player.actionState = player.actionState ?? "idle";
  player.actionStateTimer = player.actionStateTimer ?? 0;
  if (player.actionStateMachine) return;

  player.actionStateMachine = createStateMachine({
    owner: player,
    initialState: player.actionState,
    states: createTimedStateDefinitions(
      ["idle", "run", "jump", "fall", "dash", "attack", "hurt", "dead"],
      "actionState",
      "actionStateTimer"
    )
  });
}

function syncPlayerActionState(player) {
  if (!player.actionStateMachine) initializePlayerRuntime(player);

  const nextState = resolvePlayerActionState(player);
  if (player.actionStateMachine.current !== nextState) {
    player.actionStateMachine.transition(nextState);
  }
}

function resolvePlayerActionState(player) {
  if (state.isDead) return "dead";
  if (player.hurtFlash > 0.16 && player.invuln > 0) return "hurt";
  if (player.dashTimer > 0) return "dash";
  if (player.attackTimer > 0 || player.attackRecover > 0) return "attack";
  if (!player.onGround) return player.vy < 0 ? "jump" : "fall";
  if (Math.abs(player.vx) > 30) return "run";
  return "idle";
}

// ---------------------------------------------------------------------------
// Save / checkpoint helpers
// (getSavePayload / saveProgress / loadProgress / applyPersistedProgress are
//  now in src/save/persist.ts and imported above)
// ---------------------------------------------------------------------------

function setSavedCheckpoint(targetState, checkpointId, shouldSave = true) {
  let resolvedCheckpointId = "start";
  for (const checkpoint of targetState.checkpoints) {
    checkpoint.active = checkpoint.id === checkpointId;
    if (checkpoint.active) resolvedCheckpointId = checkpoint.id;
  }
  targetState.savedCheckpointId = resolvedCheckpointId;
  targetState.activeCheckpointId = resolvedCheckpointId;
  if (shouldSave && targetState === state) {
    saveProgress(state);
  }
}

function getCheckpointById(targetState, checkpointId) {
  return targetState.checkpoints.find((checkpoint) => checkpoint.id === checkpointId)
    ?? targetState.checkpoints[0];
}

function spawnPlayerAtCheckpoint(targetState, player, checkpointId) {
  const checkpoint = getCheckpointById(targetState, checkpointId);
  player.x = checkpoint.x - 18;
  player.y = checkpoint.y - 8;
  player.vx = 0;
  player.vy = 0;
  updateCurrentRoom(targetState, player);
}

// ---------------------------------------------------------------------------
// World swap
// ---------------------------------------------------------------------------

function performWorldSwap(targetState, reason = "manual") {
  if (!targetState.abilityUnlocked.ShadowSwap) return false;

  targetState.world = targetState.world === "Light" ? "Shadow" : "Light";
  const summary = applyWorldSwapReactiveState(targetState);

  for (const enemy of targetState.enemies) {
    if (!enemy.alive) continue;
    if (enemy.worldPhase?.phase === "exposed") {
      enemy.reactionTimer = Math.max(enemy.reactionTimer, 0.14);
      enemy.reactionType = "elemental";
    }
  }

  for (const reactiveObject of getReactiveObjects(targetState)) {
    triggerReactiveObject(reactiveObject, { type: "swap", world: targetState.world });
  }

  for (const puzzle of targetState.puzzles ?? []) {
    for (const node of puzzle.nodes ?? []) {
      const dx = (targetState.player.x + targetState.player.w * 0.5) - node.x;
      const dy = (targetState.player.y + targetState.player.h * 0.5) - node.y;
      if (Math.hypot(dx, dy) > node.radius + 18) continue;
      const result = triggerPuzzleNode(puzzle, node.id, "swap", {
        world: targetState.world,
        element: targetState.element
      });
      if (result.accepted && targetState === state) {
        syncPuzzlePlatforms(targetState);
        showMessage(result.solved ? `${puzzle.label} opens a spectral route` : `${node.label} resonates`, 2.2);
      }
    }
  }

  if (targetState === state) {
    const swapText = summary.exposedEnemies > 0
      ? `${summary.exposedEnemies} foe${summary.exposedEnemies === 1 ? "" : "s"} exposed`
      : summary.empoweredEnemies > 0
        ? `${summary.empoweredEnemies} foe${summary.empoweredEnemies === 1 ? "" : "s"} empowered`
        : `${summary.activeHazards} hazards aligned`;
    showMessage(`World shifted to ${targetState.world} (${swapText})`, reason === "manual" ? 2.3 : 2);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Input handlers
// ---------------------------------------------------------------------------

function handleKeyDown(code) {
  const player = state.player;
  const movement = getMovementTuning(state, player);

  if (code === "Space") player.jumpBufferTimer = movement.jumpBufferTime;
  if ((code === "ShiftLeft" || code === "ShiftRight") && state.abilityUnlocked.Dash) tryDash();
  if (code === "KeyF") tryAttack();
  if (code === "KeyE" && state.abilityUnlocked.ShadowSwap) performWorldSwap(state);
  if (code === "KeyR") tryRestAtCheckpoint();
  if (code === "KeyI") toggleInvulnerability();

  if (code === "KeyO") {
    state.debug.showStateLabels = !state.debug.showStateLabels;
    showMessage(`State overlay ${state.debug.showStateLabels ? "enabled" : "disabled"}`);
  }
  if (code === "KeyP") {
    state.debug.showCombatBoxes = !state.debug.showCombatBoxes;
    showMessage(`Combat boxes ${state.debug.showCombatBoxes ? "enabled" : "disabled"}`);
  }
  if (code === "BracketLeft") {
    state.debug.showRequirements = !state.debug.showRequirements;
    showMessage(`Requirement overlay ${state.debug.showRequirements ? "enabled" : "disabled"}`);
  }
  if (code === "BracketRight") {
    state.debug.showSaveState = !state.debug.showSaveState;
    showMessage(`Save overlay ${state.debug.showSaveState ? "enabled" : "disabled"}`);
  }
  if (code === "Quote") {
    state.puzzleState.debugVisible = !state.puzzleState.debugVisible;
    showMessage(`Puzzle overlay ${state.puzzleState.debugVisible ? "enabled" : "disabled"}`);
  }
  if (code === "KeyL") {
    if (state.debug.showProceduralLayout) {
      state.proceduralLayout.rerollCount += 1;
      regenerateProceduralLayout(state);
      showMessage(`Challenge route rerolled (${state.proceduralLayout.seed})`, 2.4);
    } else {
      state.debug.showProceduralLayout = true;
      regenerateProceduralLayout(state);
      showMessage("Procedural route overlay enabled");
    }
  }

  if (code === "Digit1" && state.abilityUnlocked.FireShift) state.element = "Fire";
  if (code === "Digit2" && state.abilityUnlocked.IceShift) { state.element = "Ice"; showMessage("Ice stance active"); }
  if (code === "Digit3" && state.abilityUnlocked.WindShift) { state.element = "Wind"; showMessage("Wind stance active"); }
  if (code === "Digit0") state.element = "None";
}

function handleTouchAction(action) {
  const player = state.player;
  const movement = getMovementTuning(state, player);

  if (action === "jump") { player.jumpBufferTimer = movement.jumpBufferTime; return; }
  if (action === "attack") { tryAttack(); return; }
  if (action === "dash") { if (state.abilityUnlocked.Dash) tryDash(); return; }
  if (action === "swap") { if (state.abilityUnlocked.ShadowSwap) performWorldSwap(state); return; }
  if (action === "rest") { tryRestAtCheckpoint(); return; }
  if (action === "element") cycleElement();
}

function cycleElement() {
  const order = ["None", "Fire", "Ice", "Wind"];
  const index = order.indexOf(state.element);

  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(index + i) % order.length];
    if (candidate === "None") { state.element = "None"; showMessage("Element cleared"); return; }
    if (candidate === "Fire" && state.abilityUnlocked.FireShift) { state.element = "Fire"; showMessage("Fire stance active"); return; }
    if (candidate === "Ice" && state.abilityUnlocked.IceShift) { state.element = "Ice"; showMessage("Ice stance active"); return; }
    if (candidate === "Wind" && state.abilityUnlocked.WindShift) { state.element = "Wind"; showMessage("Wind stance active"); return; }
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function showMessage(message, seconds = 2.2) {
  state.messageTimer = seconds;
  hud.overlay!.textContent = message;
  hud.overlay!.classList.remove("hidden");
}

function hideMessage() {
  state.messageTimer = 0;
  hud.overlay!.classList.add("hidden");
}

function startRun() {
  if (state.started) return;
  state.started = true;
  hud.startOverlay!.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, "start");
  regenerateProceduralLayout(state);
  announceProgressionRoute(state, true);
}

function showDeathOverlay(reason) {
  state.isDead = true;
  hud.deathReason!.textContent = reason;
  hud.deathOverlay!.classList.remove("hidden");
}

function hideDeathOverlay() {
  state.isDead = false;
  hud.deathOverlay!.classList.add("hidden");
}

function showWinOverlay(reason) {
  hud.winReason!.textContent = reason;
  hud.winOverlay!.classList.remove("hidden");
}

function hideWinOverlay() {
  hud.winOverlay!.classList.add("hidden");
}

function toggleInvulnerability() {
  state.debugInvulnerable = !state.debugInvulnerable;
  showMessage(`Invulnerability ${state.debugInvulnerable ? "enabled" : "disabled"}`);
}

function tryRestAtCheckpoint() {
  const checkpointId = state.nearbyCheckpointId;
  if (!checkpointId) { showMessage("Stand at a shrine to rest"); return false; }

  const checkpoint = getCheckpointById(state, checkpointId);
  setSavedCheckpoint(state, checkpointId);
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  state.player.invuln = 0.3;
  triggerReactiveObject(checkpoint, { type: "rest", world: state.world });

  if (state.world === "Shadow") {
    state.environment.shadowRestEchoTimer = 7;
    setReactiveFlag(checkpoint, "shadowBlessing", true);
  } else {
    state.environment.shadowRestEchoTimer = 0;
    setReactiveFlag(checkpoint, "shadowBlessing", false);
  }

  showMessage(state.world === "Shadow"
    ? `Rested at ${checkpoint.label}; the shrine echoes through Shadow`
    : `Rested at ${checkpoint.label}`);
  spawnImpactParticles(checkpoint.x + checkpoint.w * 0.5, checkpoint.y + 14, "#efe0b1", 12, 0.8);
  return true;
}

// ---------------------------------------------------------------------------
// Game flow (restart / respawn)
// ---------------------------------------------------------------------------

function restartLevelFromBeginning(message = "The warrior returns to the gate") {
  const fresh = createGameState(ECLIPSE_KEEP_LEVEL);
  Object.assign(state, fresh);
  initializeStateRuntime(state);
  applyPersistedProgress(state, persistDeps);
  state.started = true;
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  hideWinOverlay();
  hideDeathOverlay();
  hideMessage();
  hud.startOverlay!.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, "start");
  regenerateProceduralLayout(state);
  showMessage(message, 3);
}

function respawnFromSavedCheckpoint(message = "The warrior rises again") {
  const fresh = createGameState(ECLIPSE_KEEP_LEVEL);
  Object.assign(state, fresh);
  initializeStateRuntime(state);
  applyPersistedProgress(state, persistDeps);
  state.started = true;
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  hideWinOverlay();
  hideDeathOverlay();
  hideMessage();
  hud.startOverlay!.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, state.savedCheckpointId);
  regenerateProceduralLayout(state);
  showMessage(message, 2.8);
}

function tryDash() {
  const player = state.player;
  const movement = getMovementTuning(state, player);
  if (!canStartDash(player)) return;
  startDash(player, movement);
}

function canStartDash(player) {
  return player.dashCooldown <= 0 && player.dashTimer <= 0;
}

function startDash(player, movement = getMovementTuning(state, player)) {
  player.dashTimer = movement.dashDuration;
  player.dashCooldown = movement.dashCooldownDuration;
  player.vx = player.facing * movement.dashSpeed;
  player.vy = 0;
  player.wallSliding = false;
  player.wallJumpGraceTimer = 0;
  player.jumpCutReady = false;
  spawnImpactParticles(player.x + player.w * 0.5, player.y + player.h * 0.58, "#d8ecff", 5, 0.55);
  applyScreenShake(0.05, 1.4);
  showMessage("Dash");
}

function getVerticalAim() {
  return (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0)
    - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Combat — attack system
// ---------------------------------------------------------------------------

const COMBO_ATTACK_DEFINITIONS = [
  {
    id: "combo-1",
    damageBonus: 0, widthBonus: 0, height: 44, offsetY: 12,
    startup: 0.1, activeTime: 0.1, cooldown: 0.2, recovery: 0.11,
    movementImpulse: 90, knockback: 240, comboWindow: 0.3, queueWindow: 0.09,
    finisher: false, hitTag: "light"
  },
  {
    id: "combo-2",
    damageBonus: 0, widthBonus: 10, height: 46, offsetY: 10,
    startup: 0.11, activeTime: 0.11, cooldown: 0.19, recovery: 0.12,
    movementImpulse: 110, knockback: 285, comboWindow: 0.28, queueWindow: 0.085,
    finisher: false, hitTag: "heavy"
  },
  {
    id: "combo-3",
    damageBonus: 1, widthBonus: 22, height: 50, offsetY: 8,
    startup: 0.13, activeTime: 0.13, cooldown: 0.28, recovery: 0.16,
    movementImpulse: 135, knockback: 360, comboWindow: 0, queueWindow: 0,
    finisher: true, hitTag: "finisher"
  }
];

function getComboAttackDefinitions() {
  return COMBO_ATTACK_DEFINITIONS;
}

function getNextComboIndex(player) {
  return player.comboChainTimer > 0
    ? Math.min(player.comboStep + 1, getComboAttackDefinitions().length - 1)
    : 0;
}

function buildComboAttackProfile(player, definition, comboIndex) {
  const attackWidth = getAttackWidth();
  return {
    id: definition.id, type: "combo", comboIndex,
    damageBonus: definition.damageBonus,
    width: attackWidth + definition.widthBonus,
    height: definition.height,
    offsetX: player.facing > 0 ? player.w : -(attackWidth + definition.widthBonus),
    offsetY: definition.offsetY,
    startup: definition.startup, attackTime: definition.activeTime,
    cooldown: definition.cooldown, recover: definition.recovery,
    forwardBoost: definition.movementImpulse, knockback: definition.knockback,
    comboWindow: definition.comboWindow, queueWindow: definition.queueWindow,
    finisher: definition.finisher, hitTag: definition.hitTag,
    slashColor: state.element === "Fire" ? "#ffb388" : state.element === "Ice" ? "#bfefff" : "#f5eee2"
  };
}

function getAttackProfile(player, mode = "auto") {
  const isDownslash = mode === "downslash" || (mode === "auto" && !player.onGround && getVerticalAim() > 0);

  if (isDownslash) {
    const attackWidth = getAttackWidth();
    return {
      id: "downslash", type: "downslash", damageBonus: 0,
      width: Math.max(42, attackWidth - 18),
      height: 58,
      offsetX: -(Math.max(42, attackWidth - 18) - player.w) * 0.5,
      offsetY: player.h - 8,
      attackTime: 0.13, cooldown: 0.16, recover: 0.08,
      forwardBoost: 0, knockback: 180, comboWindow: 0, queueWindow: 0,
      bounceStrength: getMovementTuning(state, player).pogoBounceStrength,
      slashColor: state.element === "Fire" ? "#ffbf90" : state.element === "Ice" ? "#c9f3ff" : "#f2f0ea"
    };
  }

  const comboIndex = getNextComboIndex(player);
  const definition = getComboAttackDefinitions()[comboIndex];
  return buildComboAttackProfile(player, definition, comboIndex);
}

function getAttackProfileById(player, profileId) {
  if (profileId === "downslash") return getAttackProfile(player, "downslash");
  const definitions = getComboAttackDefinitions();
  const comboIndex = Math.max(0, definitions.findIndex((entry) => entry.id === profileId));
  return buildComboAttackProfile(player, definitions[comboIndex], comboIndex);
}

function getCurrentAttackBox(player, profile) {
  return { x: player.x + profile.offsetX, y: player.y + profile.offsetY, w: profile.width, h: profile.height };
}

function getEnemyHurtbox(enemy) {
  return createHurtbox("enemy", enemy.name, enemy, "enemy");
}

function createPlayerAttackHitbox(player, profile, attackBox) {
  const hitTag = profile.type === "downslash" ? "pogo" : (profile.hitTag ?? (profile.comboIndex >= 1 ? "heavy" : "light"));
  return createHitbox({
    ownerType: "player", ownerId: "shadow-warrior", team: "player",
    x: attackBox.x, y: attackBox.y, w: attackBox.w, h: attackBox.h,
    lifetime: profile.attackTime,
    damage: getAttackDamage(profile),
    knockbackX: profile.type === "downslash" ? player.facing * 140 : player.facing * profile.knockback,
    knockbackTime: profile.finisher ? 0.22 : profile.type === "downslash" ? 0.18 : 0.16,
    staggerTime: profile.finisher ? 0.22 : profile.type === "downslash" ? 0.18 : 0.14,
    impactPower: getImpactPowerForHit({ hitTag }),
    hitTag,
    element: state.element,
    profileId: profile.id
  });
}

function applyEnemyHit(enemy, hitbox) {
  const impact = getEnemyImpactTuning(enemy);
  if (isBulwarkGuardingFront(enemy, hitbox) && !enemy.elementalState?.type?.includes?.("gust")) {
    enemy.reactionTimer = Math.max(enemy.reactionTimer, 0.14);
    enemy.reactionType = "elemental";
    enemy.hurtTimer = Math.max(enemy.hurtTimer, 0.08);
    enemy.lastHitElement = hitbox.element;
    enemy.staggeredByLastHit = false;
    return {
      damage: 0, reactionType: "elemental", impactPower: 0,
      shouldStagger: false, hitstopBonus: 0.002, reactionText: "guarded", defeated: false
    };
  }
  const elementalResult = resolveElementalHit(enemy, hitbox);
  const worldPhase = enemy.worldPhase ?? getEnemyWorldModifier(enemy, state);
  const damage = Math.max(1, Math.round(elementalResult.damage * worldPhase.damageTakenMultiplier));
  const reactionType = getReactionTypeFromHit(hitbox);
  const reactionDuration = getReactionDuration(reactionType);
  const impactPower = (hitbox.impactPower ?? getImpactPowerForHit(hitbox)) + elementalResult.impactBonus;
  const knockbackScale = impact.knockbackScale / Math.max(0.65, impact.weight);
  const knockbackX = hitbox.knockbackX * knockbackScale * elementalResult.knockbackMultiplier;
  const staggerTime = hitbox.staggerTime * impact.staggerScale;
  const shouldStagger = impactPower >= impact.staggerThreshold || reactionType === "finisher";

  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.invuln = 0.16;
  enemy.hurtTimer = reactionType === "finisher" ? 0.26 : reactionType === "pogo" ? 0.22 : 0.2;
  enemy.knockbackTimer = hitbox.knockbackTime;
  enemy.vx = knockbackX;
  enemy.targetVx = 0;
  enemy.reactionTimer = reactionDuration;
  enemy.reactionType = reactionType;
  enemy.lastHitElement = hitbox.element;
  enemy.lastImpactPower = impactPower;
  enemy.lastKnockbackX = knockbackX;
  enemy.staggeredByLastHit = shouldStagger;
  applyEnemyElementalStatus(enemy, elementalResult);
  if (shouldStagger) {
    beginEnemyStagger(enemy, Math.max(0.08, staggerTime));
  }

  return {
    damage, reactionType, impactPower, shouldStagger,
    hitstopBonus: (impact.hitstopBonus ?? 0) + elementalResult.hitstopBonus,
    reactionText: elementalResult.reactionText,
    defeated: enemy.hp <= 0
  };
}

function canQueueComboAttack(player) {
  const profile = getAttackProfile(player, "normal");
  return player.attackType === "combo" && player.comboChainTimer > 0 && player.attackCooldown <= profile.queueWindow;
}

function commitAttackProfile(player, profile) {
  player.attackType = profile.type;
  player.attackProfileId = profile.id;
  player.attackCooldown = profile.cooldown;
  player.attackTimer = profile.attackTime;
  player.attackRecover = profile.recover;
  player.queuedAttack = false;
  player.comboChainTimer = profile.comboWindow;
  player.comboStep = profile.type === "combo" ? profile.comboIndex : -1;
  player.vx += player.facing * profile.forwardBoost;
}

function tryAttack(mode = "auto") {
  const player = state.player;
  if (player.attackCooldown > 0) {
    if (mode === "auto" && canQueueComboAttack(player)) player.queuedAttack = true;
    return false;
  }

  const profile = getAttackProfile(player, mode);
  commitAttackProfile(player, profile);
  audio.playAttackSound();

  const attackBox = getCurrentAttackBox(player, profile);
  const attackHitbox = createPlayerAttackHitbox(player, profile, attackBox);
  spawnSlashTrail(attackBox, profile.type === "downslash" ? 1 : player.facing, profile.slashColor, profile.type);

  let landedHit = false;
  let pogoTarget = null;

  for (const enemy of state.enemies) {
    const hurtbox = getEnemyHurtbox(enemy);
    if (!enemy.alive || !overlapsHitbox(attackHitbox, hurtbox) || enemy.invuln > 0) continue;

    landedHit = true;
    const result = applyEnemyHit(enemy, attackHitbox);
    const baseHitStop = result.reactionType === "finisher" ? 0.07 : result.reactionType === "heavy" ? 0.06 : result.reactionType === "pogo" ? 0.05 : 0.045;
    const shakeStrength = result.reactionType === "finisher" ? 8 : result.reactionType === "heavy" ? 7 : 6;
    applyHitStop(baseHitStop + result.hitstopBonus, shakeStrength);
    spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, profile.slashColor, profile.finisher ? 12 : 8);
    showMessage(`${enemy.name} hit for ${result.damage}${result.reactionText ? ` (${result.reactionText})` : ""}${result.shouldStagger ? " and staggered" : ""}`);
    if (isPogoAttackProfile(profile) && !pogoTarget) pogoTarget = createPogoTarget("enemy", enemy);
    if (result.defeated) handleEnemyDefeat(enemy);
  }

  for (const entity of state.entities.getByType("hazard")) {
    const hazard = entity.source;
    if (!overlapsHitbox(attackHitbox, hazard)) continue;
    const hazardReaction = applyEnvironmentElementReaction("hazard", hazard, attackHitbox.element);
    if (hazardReaction.changed) {
      landedHit = true;
      spawnImpactParticles(hazard.x + hazard.w * 0.5, hazard.y + 4, hazardReaction.color ?? "#fff0c2", 8, 0.8);
      showMessage(hazardReaction.message);
    }
  }

  if (state.barrier.active && overlapsHitbox(attackBox, state.barrier)) {
    triggerReactiveObject(state.barrier, { type: "attack", actor: state.player, element: attackHitbox.element });
    const barrierReaction = applyEnvironmentElementReaction("barrier", state.barrier, attackHitbox.element);
    if (isPogoAttackProfile(profile)) {
      landedHit = true;
      pogoTarget = pogoTarget ?? createPogoTarget("barrier", state.barrier);
      spawnImpactParticles(state.barrier.x + state.barrier.w * 0.5, state.barrier.y + 18, "#f7d8c4", 8, 0.9);
    } else if (barrierReaction.outcome === "clear" || meetsRequirements(state.barrier.requirements, state)) {
      state.barrier.active = false;
      setProgressionFlag(state, "worldFlags", "barrierCleared", true);
      regenerateProceduralLayout(state);
      landedHit = true;
      applyHitStop(0.045, 5);
      spawnImpactParticles(state.barrier.x + state.barrier.w * 0.5, state.barrier.y + 26, barrierReaction.color ?? "#ff9f68", 12, 1.1);
      announceProgressionRoute(state, true);
      saveProgress(state);
      showMessage(barrierReaction.message ?? "Barrier burned away");
    } else if (barrierReaction.message) {
      showMessage(barrierReaction.message);
    } else {
      showMessage(state.barrier.failureMessage);
    }
  }

  if (state.gate.active && overlapsHitbox(attackBox, state.gate)) {
    triggerReactiveObject(state.gate, { type: "attack", actor: state.player, element: attackHitbox.element });
    if (!meetsRequirements(state.gate.requirements, state)) showMessage(state.gate.failureMessage);
  }

  for (const puzzle of state.puzzles ?? []) {
    for (const node of puzzle.nodes ?? []) {
      if (node.triggerType !== "attack") continue;
      if (!aabbOverlap(attackHitbox, { x: node.x - node.radius, y: node.y - node.radius, w: node.radius * 2, h: node.radius * 2 })) continue;
      const result = triggerPuzzleNode(puzzle, node.id, "attack", { world: state.world, element: attackHitbox.element });
      if (result.accepted) {
        landedHit = true;
        syncPuzzlePlatforms(state);
        spawnImpactParticles(node.x, node.y, attackHitbox.element === "Fire" ? "#ffbf90" : "#f6efe0", 8, 0.7);
        showMessage(result.solved ? `${puzzle.label} opens a spectral route` : `${node.label} ignites`, 2.2);
      }
    }
  }

  if (isPogoAttackProfile(profile)) {
    const hazardTarget = findPogoHazardTarget(attackBox);
    if (hazardTarget) {
      landedHit = true;
      pogoTarget = pogoTarget ?? hazardTarget;
      spawnImpactParticles(hazardTarget.source.x + hazardTarget.source.w * 0.5, hazardTarget.source.y + 4, "#d8ecff", 8, 0.8);
    }
  }

  if (pogoTarget) applyPogoBounce(profile.bounceStrength, pogoTarget);
  if (!landedHit) applyScreenShake(0.06, 1.8);
  return landedHit;
}

function isPogoAttackProfile(profile) { return profile.type === "downslash"; }
function createPogoTarget(kind, source) { return { kind, source }; }

function findPogoHazardTarget(attackBox) {
  for (const entity of state.entities.getByType("hazard")) {
    const hazard = entity.source;
    if (overlapsHitbox(attackBox, hazard)) return createPogoTarget("hazard", hazard);
  }
  return null;
}

function getPogoBounceStrength(baseStrength, pogoTarget, movement = getMovementTuning(state, state.player)) {
  if (!pogoTarget) return baseStrength;
  if (pogoTarget.kind === "hazard") return baseStrength * movement.pogoHazardBounceMultiplier;
  if (pogoTarget.kind === "barrier") return baseStrength * movement.pogoBarrierBounceMultiplier;
  return baseStrength * movement.pogoEnemyBounceBonus;
}

function applyPogoBounce(strength, pogoTarget = null) {
  const player = state.player;
  const movement = getMovementTuning(state, player);
  const resolvedStrength = getPogoBounceStrength(strength, pogoTarget, movement);
  player.vy = -(state.element === "Wind" ? resolvedStrength * 1.04 : resolvedStrength);
  player.jumpCutReady = false;
  player.jumpReleased = false;
  player.pogoGraceTimer = movement.pogoHazardGraceTime;
  player.onGround = false;
  player.wallSliding = false;
  applyHitStop(0.035, 4);
  spawnImpactParticles(player.x + player.w * 0.5, player.y + player.h, pogoTarget?.kind === "hazard" ? "#d8ecff" : "#f1f6ff", 8, 0.85);
}

function getAttackDamage(profile = null) {
  const baseDamage = state.player.weaponStage === 0 ? 1 : 2;
  return baseDamage + (profile?.damageBonus ?? 0);
}

function getAttackWidth() {
  return state.player.weaponStage === 0 ? 62 : 82;
}

function overlapsHitbox(hitbox, hurtbox) { return aabbOverlap(hitbox, hurtbox); }
function overlapsTrigger(a, b) { return aabbOverlap(a, b); }
function overlapsHazard(entity, hazard) { return aabbOverlap(entity, hazard); }

function applyHitStop(duration, shakeStrength = 0) {
  state.combat.hitStop = Math.max(state.combat.hitStop, duration);
  applyScreenShake(duration * 8, shakeStrength);
}

function handleEnemyDefeat(enemy, reason = `${enemy.name} defeated`) {
  enemy.alive = false;
  if (enemy.boss) {
    setProgressionFlag(state, "worldFlags", "bossDefeated", true);
    regenerateProceduralLayout(state);
    announceProgressionRoute(state, true);
    saveProgress(state);
  }
  applyHitStop(0.07, 8);
  spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#fff6dc", 12, 1.25);
  showMessage(reason);
}

function applyScreenShake(duration, strength) {
  state.combat.screenShake = Math.max(state.combat.screenShake, duration);
  state.combat.screenShakeStrength = Math.max(state.combat.screenShakeStrength, strength);
}

function spawnSlashTrail(attackBox, facing, color, slashType = "normal") {
  if (state.slashEffects.length >= MAX_SLASH_EFFECTS) state.slashEffects.shift();
  state.slashEffects.push({
    x: facing > 0 ? attackBox.x : attackBox.x + attackBox.w,
    y: attackBox.y + attackBox.h * 0.52,
    width: attackBox.w, height: attackBox.h + 14,
    facing, color, type: slashType,
    life: 0.14, maxLife: 0.14
  });
}

function spawnImpactParticles(x, y, color, count, speedMultiplier = 1) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = (70 + Math.random() * 150) * speedMultiplier;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.2 + Math.random() * 0.16,
      maxLife: 0.36,
      size: 2 + Math.random() * 3,
      gravity: 340, drag: 0.92, color
    });
  }
}

function updateCombatEffects(dt) {
  state.combat.hitStop = Math.max(0, state.combat.hitStop - dt);
  state.combat.screenShake = Math.max(0, state.combat.screenShake - dt);
  state.combat.screenShakeStrength += (0 - state.combat.screenShakeStrength) * Math.min(1, dt * 10);

  for (let i = state.slashEffects.length - 1; i >= 0; i--) {
    const effect = state.slashEffects[i];
    effect.life -= dt;
    if (effect.life <= 0) state.slashEffects.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];
    particle.life -= dt;
    if (particle.life <= 0) { state.particles.splice(i, 1); continue; }
    particle.vx *= particle.drag;
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
}

// ---------------------------------------------------------------------------
// Main update loop
// ---------------------------------------------------------------------------

function update(frame) {
  const frameDt = typeof frame === "number" ? frame : frame.clampedDeltaSeconds;
  updateCombatEffects(frameDt);

  if (!state.started) { updateDisplayValues(frameDt); updateHud(); return; }
  if (state.combat.hitStop > 0) { updateDisplayValues(frameDt); updateHud(); return; }
  if (state.gameWon || state.isDead) { updateHud(); return; }

  if (state.messageTimer > 0) {
    state.messageTimer -= frameDt;
    if (state.messageTimer <= 0) hud.overlay!.classList.add("hidden");
  }

  const fixedSteps = typeof frame === "number" ? 0 : frame.fixedSteps;
  const stepDt = typeof frame === "number" ? frameDt : frame.fixedStepSeconds;
  const simulationSteps = fixedSteps > 0 ? fixedSteps : (frameDt > 0 ? 1 : 0);

  for (let stepIndex = 0; stepIndex < simulationSteps; stepIndex += 1) {
    updateSimulation(stepDt);
    if (state.gameWon || state.isDead) break;
  }

  updateCamera(frameDt);
  updateDisplayValues(frameDt);
  updateHud();
}

function updateSimulation(dt) {
  updatePlayer(dt);
  updateCurrentRoom(state, state.player);
  updateEnvironmentElementState(state, dt);
  updateEnvironmentReactivity(dt);
  updatePuzzleSystems(dt);
  updateEnemies(dt);
  updateHazards();
  updateCheckpoints();
  updatePickups();
  updateSecrets(dt);
  updateGate();
  updateProgressionState();
}

function updateEnvironmentReactivity(dt) {
  updateReactiveTimers(getReactiveObjects(state), dt);
  state.environment.shadowRestEchoTimer = Math.max(0, state.environment.shadowRestEchoTimer - dt);

  if (state.gate.active && Math.abs((state.player.x + state.player.w * 0.5) - (state.gate.x + state.gate.w * 0.5)) < 84) {
    triggerReactiveObject(state.gate, { type: "approach", actor: state.player });
  }

  for (const cache of state.secretCaches ?? []) {
    if (!cache.active) continue;
    if (overlapsTrigger(state.player, cache)) {
      triggerReactiveObject(cache, { type: "approach", actor: state.player });
    }
    const shadowRevealed = getReactiveFlag(cache, "shadowRevealed");
    cache.revealAlpha = shadowRevealed && state.world === "Shadow" ? 1 : 0.5;
  }

  if (state.environment.shadowRestEchoTimer > 0) {
    state.player.pogoGraceTimer = Math.max(state.player.pogoGraceTimer, 0.03);
  }
}

function updatePuzzleSystems(dt) {
  for (const puzzle of state.puzzles ?? []) {
    updatePuzzleState(puzzle, dt);
  }
  syncPuzzlePlatforms(state);
}

// ---------------------------------------------------------------------------
// Player physics
// ---------------------------------------------------------------------------

function updatePlayer(dt) {
  const player = state.player;
  const movement = getMovementTuning(state, player);
  player.actionStateTimer += dt;

  player.coyoteTimer -= dt;
  player.jumpBufferTimer -= dt;
  player.comboChainTimer -= dt;
  player.attackTimer -= dt;
  player.attackCooldown -= dt;
  player.dashCooldown -= dt;
  player.invuln -= dt;
  player.hurtFlash -= dt;
  player.attackRecover -= dt;
  player.wallJumpLock -= dt;
  player.wallJumpGraceTimer -= dt;
  player.pogoGraceTimer -= dt;

  const moveAxis = getMoveAxis();
  player.moveAxis = moveAxis;
  if (moveAxis !== 0) player.facing = moveAxis;

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    if (player.dashTimer <= 0) player.vx *= movement.dashEndMomentumMultiplier;
  } else {
    player.vx = resolveHorizontalVelocity(player, movement, moveAxis, dt);
    player.vy += getPlayerGravity(player, movement) * dt;
    player.vy = Math.min(player.vy, movement.terminalFallSpeed);
  }

  const wallData = getWallTouch(player);
  updateWallInteractionState(player, wallData, movement);
  tryConsumeBufferedJump(player, movement);

  if (player.wallSliding) player.vy = Math.min(player.vy, movement.wallSlideSpeed);

  if (player.jumpReleased && player.jumpCutReady && player.vy < -movement.jumpCutVelocityGate) {
    player.vy *= movement.jumpCutMultiplier;
    player.jumpCutReady = false;
  }
  player.jumpReleased = false;

  moveHorizontally(player, dt);
  moveVertically(player, dt);
  player.actionStateMachine.update(dt);
  syncPlayerActionState(player);

  if (player.queuedAttack && player.attackCooldown <= 0.05) tryAttack("normal");

  if (player.comboChainTimer <= 0 && player.attackCooldown <= 0) {
    player.comboStep = -1;
    player.queuedAttack = false;
    player.attackType = "normal";
    player.attackProfileId = "combo-1";
  }

  if (player.y > canvas.height + 220) resetRun("You fell into the abyss");

  if (hasBossAlive(state.enemies) && player.x > 3440 && !state.bossIntroShown) {
    state.bossIntroShown = true;
    setProgressionFlag(state, "worldFlags", "bossAwakened", true);
    showMessage("The Eclipse Lord awakens");
  }

  if (!state.gate.active && !hasBossAlive(state.enemies) && overlapsTrigger(player, state.exitZone)) {
    state.gameWon = true;
    showMessage("Vertical slice cleared", 4);
    showWinOverlay("You broke the Eclipse Lord and survived the fivefold descent into Shadow Shift.");
  }
}

function getMoveAxis() {
  return (keys.has("KeyD") || keys.has("ArrowRight") || touchState.right ? 1 : 0)
    - (keys.has("KeyA") || keys.has("ArrowLeft") || touchState.left ? 1 : 0);
}

function getPlayerGravity(player, movement = getMovementTuning(state, player)) {
  if (player.onGround) return state.gravity;
  if (player.vy < -movement.apexVelocityWindow) return state.gravity * movement.riseGravityMultiplier;
  if (Math.abs(player.vy) <= movement.apexVelocityWindow) return state.gravity * movement.apexGravityMultiplier;
  return state.gravity * movement.fallGravityMultiplier;
}

function updateWallInteractionState(player, wallData, movement) {
  player.onWall = wallData.touching && !player.onGround;

  if (player.onWall) {
    player.wallDirection = wallData.direction;
    player.lastWallDirection = wallData.direction;
    player.wallJumpGraceTimer = movement.wallJumpGraceTime;
  } else if (player.wallJumpGraceTimer <= 0) {
    player.wallDirection = 0;
  }

  player.wallSliding = player.onWall
    && player.wallJumpLock <= 0
    && player.dashTimer <= 0
    && player.vy >= movement.wallSlideEntrySpeed;
}

function tryConsumeBufferedJump(player, movement) {
  if (player.jumpBufferTimer <= 0) return false;
  if (player.coyoteTimer > 0) { performGroundJump(player, movement); return true; }
  if (canWallJump(player)) { performWallJump(player, movement); return true; }
  return false;
}

function performGroundJump(player, movement) {
  player.vy = -movement.jumpForce;
  player.jumpBufferTimer = 0;
  player.coyoteTimer = 0;
  player.onGround = false;
  player.wallSliding = false;
  player.jumpCutReady = true;
}

function canWallJump(player) {
  return !player.onGround && player.wallJumpGraceTimer > 0 && player.lastWallDirection !== 0;
}

function performWallJump(player, movement) {
  const jumpDirection = player.wallDirection || player.lastWallDirection;
  player.vx = -jumpDirection * movement.wallJumpHorizontalSpeed;
  player.vy = -movement.jumpForce * movement.wallJumpVerticalMultiplier;
  player.jumpBufferTimer = 0;
  player.wallJumpLock = movement.wallJumpLockDuration;
  player.wallJumpGraceTimer = 0;
  player.wallSliding = false;
  player.onWall = false;
  player.wallDirection = 0;
  player.jumpCutReady = true;
  showMessage("Wall jump");
}

function moveHorizontally(player, dt) {
  const result = resolveHorizontal(player, player.vx * dt, getSolids());
  player.x = result.x;
  if (result.collided) player.vx = 0;
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > state.worldWidth) player.x = state.worldWidth - player.w;
}

function moveVertically(player, dt) {
  const movement = getMovementTuning(state, player);
  const result = resolveVertical(player, player.vy * dt, getSolids());
  player.y = result.y;
  player.onGround = false;
  if (result.grounded) {
    player.vy = 0;
    player.onGround = true;
    player.wallSliding = false;
    player.coyoteTimer = movement.coyoteTime;
    player.jumpCutReady = false;
  } else if (result.ceilingHit) {
    player.vy = 0;
    player.jumpCutReady = false;
  }
}

function getWallTouch(player) {
  const solids = getSolids();
  const leftProbe = createRect(player.x - 4, player.y + 8, 4, player.h - 16);
  const rightProbe = createRect(player.x + player.w, player.y + 8, 4, player.h - 16);
  if (probeOverlap(leftProbe, solids)) return { touching: true, direction: -1 };
  if (probeOverlap(rightProbe, solids)) return { touching: true, direction: 1 };
  return { touching: false, direction: 0 };
}

function getSolids() {
  return collectWorldSolids(state);
}

// ---------------------------------------------------------------------------
// Hazards and enemies
// ---------------------------------------------------------------------------

function updateHazards() {
  if (state.debugInvulnerable) return;
  if (state.player.invuln > 0 || state.player.pogoGraceTimer > 0) return;

  for (const entity of state.entities.getByType("hazard")) {
    const hazard = entity.source;
    if (!overlapsHazard(state.player, hazard)) continue;
    if (!isWorldEntityActive(hazard, state.world)) continue;

    const contactProfile = getHazardContactProfile(hazard, state.element);
    if (!contactProfile.active) continue;

    state.player.hp = Math.max(0, state.player.hp - contactProfile.damage);
    state.player.invuln = 0.55;
    state.player.hurtFlash = 0.28;
    state.player.vy = -210;
    state.player.vx = (state.player.facing >= 0 ? -220 : 220) * contactProfile.knockbackMultiplier;
    audio.playHitSound();
    applyHitStop(0.04, 5);
    spawnImpactParticles(state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.8, "#dff3ff", 8, 0.9);
    showMessage(contactProfile.message);
    if (state.player.hp <= 0) handleDeath("You Died", "The cold ruins claimed you");
    break;
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (!enemy.aiStateMachine) initializeEnemyRuntime(enemy);

    enemy.invuln -= dt;
    enemy.hurtTimer -= dt;
    enemy.knockbackTimer -= dt;
    enemy.actionCooldown -= dt;
    enemy.stateTimer -= dt;
    enemy.contactCooldown -= dt;
    enemy.reactionTimer -= dt;

    const elementalTick = updateEnemyElementalState(enemy, dt);
    if (elementalTick.damage > 0) {
      enemy.hp = Math.max(0, enemy.hp - elementalTick.damage);
      enemy.hurtTimer = Math.max(enemy.hurtTimer, 0.12);
      enemy.reactionTimer = Math.max(enemy.reactionTimer, 0.12);
      enemy.reactionType = "elemental";
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#ffbf90", 4, 0.45);
      if (enemy.hp <= 0) { handleEnemyDefeat(enemy, `${enemy.name} burned away`); continue; }
    }

    enemy.aiStateMachine.update(dt);
    if (enemy.reactionTimer <= 0) enemy.reactionType = "none";

    // Delegate per-type AI to enemy-ai module (DIP — no game-loop knowledge there)
    updateEnemyBehavior(enemy, dt, state, aiServices);

    if (overlapsHitbox(state.player, enemy) && state.player.invuln <= 0 && enemy.contactCooldown <= 0) {
      if (state.debugInvulnerable) { enemy.contactCooldown = 0.15; continue; }
      const damage = enemy.contactDamage ?? 1;
      const contactDamage = Math.max(1, Math.round(damage + (enemy.worldPhase?.contactDamageBonus ?? 0)));
      state.player.hp = Math.max(0, state.player.hp - contactDamage);
      state.player.invuln = 0.55;
      state.player.hurtFlash = 0.28;
      const knockback = enemy.type === "demon" ? 320 : enemy.type === "watcher" ? 210 : enemy.type === "hound" ? 270 : enemy.type === "bulwark" ? 340 : 240;
      state.player.vx = state.player.x + state.player.w * 0.5 < enemy.x + enemy.w * 0.5 ? -knockback : knockback;
      state.player.vy = enemy.type === "watcher" ? -120 : enemy.type === "bulwark" ? -210 : -180;
      enemy.contactCooldown = getEnemyContactCooldown(enemy);
      audio.playHitSound();
      applyHitStop(
        enemy.type === "demon" || enemy.type === "bulwark" ? 0.055 : 0.04,
        enemy.type === "demon" || enemy.type === "bulwark" ? 9 : 7
      );
      spawnImpactParticles(state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.4, "#ffffff", 8, 0.9);
      showMessage(`${enemy.name} struck you${contactDamage > 1 ? ` for ${contactDamage}` : ""}`);
      if (state.player.hp <= 0) { handleDeath("You Died", "The shadows overwhelmed you"); return; }
    }
  }
}

// ---------------------------------------------------------------------------
// Game state updates
// ---------------------------------------------------------------------------

function updateDisplayValues(dt) {
  state.player.displayHp += (state.player.hp - state.player.displayHp) * Math.min(1, dt * 10);
  for (const enemy of state.enemies) {
    enemy.displayHp += (enemy.hp - enemy.displayHp) * Math.min(1, dt * 10);
  }
}

function updatePickups() {
  const player = state.player;

  for (const entity of state.entities.getByType("pickup")) {
    const pickup = entity.source;
    if (!pickup.active || !overlapsTrigger(player, pickup)) continue;

    if (entity.components.reward === "Dash") {
      pickup.active = false;
      state.abilityUnlocked.Dash = true;
      regenerateProceduralLayout(state);
      announceProgressionRoute(state, true);
      saveProgress(state);
      showMessage("Dash unlocked");
      continue;
    }

    if (entity.components.reward === "WeaponStage") {
      pickup.active = false;
      player.weaponStage = 1;
      regenerateProceduralLayout(state);
      announceProgressionRoute(state, true);
      saveProgress(state);
      showMessage("Weapon evolved to Stage II");
    }
  }
}

function updateSecrets(dt) {
  const player = state.player;

  for (const entity of state.entities.getByType("secret")) {
    const cache = entity.source;
    cache.feedbackTimer = Math.max(0, (cache.feedbackTimer ?? 0) - dt);
    if (!cache.active || !overlapsTrigger(player, cache)) continue;

    if (!meetsRequirements(cache.requirements, state)) {
      if (cache.feedbackTimer <= 0) {
        cache.feedbackTimer = 0.9;
        showMessage(cache.failureMessage ?? "This reliquary remains sealed");
      }
      continue;
    }

    cache.active = false;
    setProgressionFlag(state, "optionalSecrets", cache.reward.secretId, true);
    if (cache.reward.keyItem) setProgressionFlag(state, "keyItems", cache.reward.keyItem, true);
    if (cache.reward.type === "maxHp") {
      state.player.maxHp += cache.reward.amount ?? 1;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + (cache.reward.amount ?? 1));
      state.player.displayHp = state.player.hp;
    }
    spawnImpactParticles(cache.x + cache.w * 0.5, cache.y + cache.h * 0.5, "#fff0c2", 14, 0.9);
    regenerateProceduralLayout(state);
    announceProgressionRoute(state, true);
    saveProgress(state);
    showMessage("The reliquary yields a Moon Seal and deeper vitality", 3.2);
  }
}

function updateCheckpoints() {
  state.nearbyCheckpointId = null;
  for (const entity of state.entities.getByType("checkpoint")) {
    const checkpoint = entity.source;
    if (overlapsTrigger(state.player, checkpoint)) {
      state.nearbyCheckpointId = entity.components.checkpointId;
      return;
    }
  }
}

function updateGate() {
  state.gate.active = !meetsRequirements(state.gate.requirements, state);
}

function updateProgressionState() {
  setProgressionFlag(state, "worldFlags", "gateOpened", !state.gate.active);
  setProgressionFlag(state, "worldFlags", "barrierCleared", !state.barrier.active);
  setProgressionFlag(state, "worldFlags", "bossAwakened", state.bossIntroShown);
  setProgressionFlag(state, "worldFlags", "bossDefeated", !hasBossAlive(state.enemies));
}

function updateCamera(dt) {
  const targetX = clamp(state.player.x - canvas.width * 0.35, 0, state.worldWidth - canvas.width);
  state.camera.x += (targetX - state.camera.x) * Math.min(1, dt / state.camera.smooth);
}

function updateHud() {
  const currentRoom = getCurrentRoom(state);
  const currentRoute = getCurrentProgressionRoute(state);
  const optionalRoute = getAvailableOptionalRoutes(state)[0] ?? null;
  hud.health!.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  const hpPercent = clamp(state.player.hp / state.player.maxHp, 0, 1) * 100;
  const displayPercent = clamp(state.player.displayHp / state.player.maxHp, 0, 1) * 100;
  (hud.healthBar as HTMLElement).style.width = `${hpPercent}%`;
  (hud.healthBarGhost as HTMLElement).style.width = `${displayPercent}%`;
  hud.world!.textContent = state.world;
  hud.element!.textContent = state.element;
  hud.weapon!.textContent = state.player.weaponStage === 0 ? "Shard Blade I" : "Shard Blade II";
  hud.invulnerable!.textContent = state.debugInvulnerable ? "On" : "Off";

  if (!state.started) {
    hud.objective!.textContent = "Press Enter to begin";
  } else if (state.gameWon) {
    hud.objective!.textContent = "Exit reached";
  } else if (hasBossAlive(state.enemies) && state.player.x > 3400) {
    hud.objective!.textContent = "Defeat the Eclipse Lord";
  } else if (state.nearbyCheckpointId) {
    const checkpoint = getCheckpointById(state, state.nearbyCheckpointId);
    hud.objective!.textContent = `Press R to rest at ${checkpoint.label}`;
  } else if (currentRoute) {
    hud.objective!.textContent = currentRoute.roomId === currentRoom.id
      ? currentRoute.objective
      : `${currentRoute.objective} (${getRoomById(state, currentRoute.roomId).label})`;
  } else if (optionalRoute) {
    hud.objective!.textContent = `${optionalRoute.objective} (Optional)`;
  } else {
    hud.objective!.textContent = getRoomProgressionHint(state, currentRoom);
  }
}

// ---------------------------------------------------------------------------
// Death and reset
// ---------------------------------------------------------------------------

function resetRun(message) {
  respawnFromSavedCheckpoint(message);
}

function handleDeath(message, reason) {
  audio.playDeathSound();
  showMessage(message, 2.8);
  showDeathOverlay(reason);
}

// ---------------------------------------------------------------------------
// Wiring — AI services, renderer, runtime
// ---------------------------------------------------------------------------

// AI services inject the side-effect callbacks enemy-ai.ts needs (DIP).
const aiServices = {
  showMessage: (msg: string) => showMessage(msg),
  spawnImpactParticles: (x: number, y: number, color: string, count: number, speedMult?: number) =>
    spawnImpactParticles(x, y, color, count, speedMult),
  applyScreenShake: (duration: number, strength: number) => applyScreenShake(duration, strength)
};

// Renderer receives pure query functions — it never mutates state (SRP).
const renderer = createRenderer(ctx, canvas, {
  getAttackProfileById,
  getCurrentAttackBox,
  createPlayerAttackHitbox,
  getEnemyHurtbox,
  getCurrentRoom,
  getRoomEntities,
  getCurrentProgressionRoute,
  getAvailableOptionalRoutes
});

const runtime = createRuntime({
  timing: {
    fixedStepSeconds: 1 / 120,
    maxFrameDeltaSeconds: 1 / 30,
    maxFixedSteps: 4
  },
  onFrame(frame) {
    update(frame);
    renderer.draw(state);
  }
});

updateHud();
runtime.start();
