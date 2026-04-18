const BASE_CANVAS_WIDTH = 1280;
const BASE_CANVAS_HEIGHT = 720;
const MAX_PARTICLES = 180;
const MAX_SLASH_EFFECTS = 10;

const canvas = document.getElementById("gameCanvas");
canvas.width = BASE_CANVAS_WIDTH;
canvas.height = BASE_CANVAS_HEIGHT;
const ctx = canvas.getContext("2d", { alpha: false });
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

const keys = new Set();
const touchState = {
  left: false,
  right: false
};
const touchButtons = Array.from(document.querySelectorAll("[data-touch], [data-touch-tap]"));
let audioContext = null;
let themeStarted = false;
let themeIntervalId = null;
let masterGain = null;
let ambientNoiseNode = null;
let ambientNoiseGain = null;

function clearInputState() {
  keys.clear();
  touchState.left = false;
  touchState.right = false;
  if (typeof state !== "undefined" && state.player) {
    state.player.jumpReleased = false;
  }
  for (const button of touchButtons) {
    button.classList.remove("is-active");
  }
}

function setTouchMode(enabled) {
  document.body.classList.toggle("touch-mode", enabled);
}

window.addEventListener("keydown", (event) => {
  if (["Space", "KeyE", "KeyF", "ShiftLeft", "ShiftRight", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }

  if (!state.started) {
    if (["Enter", "Space"].includes(event.code)) {
      ensureAudio();
      startRun();
    }
    return;
  }

  keys.add(event.code);
  ensureAudio();
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
    pauseTheme();
  } else if (state.started) {
    ensureAudio();
  }
});

hud.startButton.addEventListener("click", () => {
  ensureAudio();
  startRun();
});

hud.retryButton.addEventListener("click", () => {
  ensureAudio();
  hideDeathOverlay();
  respawnFromSavedCheckpoint("The warrior rises again");
});

hud.restartLevelButton.addEventListener("click", () => {
  ensureAudio();
  restartLevelFromBeginning("The keep reshapes itself");
});

hud.restartWinButton.addEventListener("click", () => {
  ensureAudio();
  hideWinOverlay();
  respawnFromSavedCheckpoint("The warrior steps back into the ruin");
});

hud.restartLevelWinButton.addEventListener("click", () => {
  ensureAudio();
  restartLevelFromBeginning("The warrior returns to the outer gate");
});

hud.invulnerableToggleButton.addEventListener("click", () => {
  toggleInvulnerability();
});

for (const button of document.querySelectorAll("[data-touch]")) {
  const control = button.dataset.touch;
  const press = (event) => {
    event.preventDefault();
    setTouchMode(true);
    ensureAudio();
    if (!state.started) {
      startRun();
    }
    touchState[control] = true;
    button.classList.add("is-active");
  };
  const release = (event) => {
    event.preventDefault();
    touchState[control] = false;
    button.classList.remove("is-active");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

for (const button of document.querySelectorAll("[data-touch-tap]")) {
  const action = button.dataset.touchTap;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setTouchMode(true);
    ensureAudio();
    if (!state.started) {
      startRun();
      return;
    }
    button.classList.add("is-active");
    handleTouchAction(action);
  });
  const clear = (event) => {
    event.preventDefault();
    button.classList.remove("is-active");
  };
  button.addEventListener("pointerup", clear);
  button.addEventListener("pointercancel", clear);
  button.addEventListener("pointerleave", clear);
}

const COLORS = {
  light: "#eadfa0",
  shadow: "#6677d6",
  none: "#ffffff",
  fire: "#ff7b4a",
  ice: "#8bdcff",
  wind: "#a9ffb3",
  playerCore: "#f4efe1",
  cape: "#191826",
  steel: "#c1cbdb",
  enemy: "#cf5c7b",
  enemyHit: "#fff1f1",
  gate: "#7d6c52",
  gateOpen: "#8bf8c9",
  burnable: "#6b4d32",
  burnableHot: "#8d3b24",
  pickupDash: "#f4d87c",
  pickupWeapon: "#9be8ff",
  goblin: "#8cb34d",
  shadowWalker: "#6d6fc9",
  demon: "#cf534f",
  watcher: "#7ed7ff"
};

const SAVE_KEY = "shadow-shift-web-save";

const state = createInitialState();
initializeStateRuntime(state);
applyPersistedProgress(state);

function initializeStateRuntime(targetState) {
  targetState.player.maxHp = targetState.player.maxHp ?? targetState.player.hp;
  targetState.player.displayHp = targetState.player.maxHp;
  for (const enemy of targetState.enemies) {
    enemy.maxHp = enemy.maxHp ?? enemy.hp;
    enemy.displayHp = enemy.maxHp;
    enemy.reactionTimer = enemy.reactionTimer ?? 0;
    enemy.reactionType = enemy.reactionType ?? "none";
    initializeEnemyRuntime(enemy);
  }
}

function initializeEnemyRuntime(enemy) {
  const startingDirection = Math.sign(enemy.vx) || 1;
  const moveTuning = getEnemyMoveSettings(enemy);
  const startingState = enemy.boss && !enemy.awakened ? "idle" : "patrol";
  enemy.actionCooldown = enemy.actionCooldown != null ? enemy.actionCooldown : (enemy.alertCooldown != null ? enemy.alertCooldown : 0);
  enemy.maxSpeed = enemy.maxSpeed != null ? enemy.maxSpeed : Math.abs(enemy.vx || enemy.baseSpeed || 90);
  enemy.state = enemy.state != null ? enemy.state : startingState;
  enemy.stateTimer = enemy.stateTimer != null ? enemy.stateTimer : 0;
  enemy.patrolDirection = enemy.patrolDirection != null ? enemy.patrolDirection : startingDirection;
  enemy.pendingBlinkOffset = enemy.pendingBlinkOffset != null ? enemy.pendingBlinkOffset : 0;
  enemy.pendingAction = enemy.pendingAction != null ? enemy.pendingAction : null;
  enemy.targetVx = enemy.targetVx != null ? enemy.targetVx : (enemy.vx || 0);
  enemy.accel = enemy.accel != null ? enemy.accel : moveTuning.accel;
  enemy.decel = enemy.decel != null ? enemy.decel : moveTuning.decel;
  enemy.turnSpeed = enemy.turnSpeed != null ? enemy.turnSpeed : moveTuning.turnSpeed;
}

function getEnemyState(enemy) {
  return enemy.state ?? "patrol";
}

function setEnemyState(enemy, nextState, stateTime = 0) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.state = nextState;
  enemy.stateTimer = stateTime;
}

function getEnemyMoveSettings(enemy) {
  switch (enemy.type) {
    case "goblin":
      return { accel: 900, decel: 980, turnSpeed: 1350 };
    case "shadowWalker":
      return { accel: 760, decel: 820, turnSpeed: 1220 };
    case "demon":
      return { accel: 680, decel: 760, turnSpeed: 1180 };
    case "watcher":
      return { accel: 520, decel: 560, turnSpeed: 860 };
    case "oracle":
      return { accel: 560, decel: 600, turnSpeed: 920 };
    case "revenant":
      return { accel: 620, decel: 660, turnSpeed: 980 };
    default:
      return { accel: 720, decel: 760, turnSpeed: 1000 };
  }
}

function approachValue(current, target, delta) {
  if (current < target) {
    return Math.min(current + delta, target);
  }
  if (current > target) {
    return Math.max(current - delta, target);
  }
  return target;
}

function accelerateEnemyTowards(enemy, targetVelocity, dt) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  const reversing = Math.sign(enemy.vx) !== 0 && Math.sign(targetVelocity) !== 0 && Math.sign(enemy.vx) !== Math.sign(targetVelocity);
  const rate = reversing
    ? enemy.turnSpeed
    : Math.abs(targetVelocity) > Math.abs(enemy.vx)
      ? enemy.accel
      : enemy.decel;
  enemy.targetVx = targetVelocity;
  enemy.vx = approachValue(enemy.vx, targetVelocity, rate * dt);
}

function brakeEnemy(enemy, dt, brakeMultiplier = 1) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.targetVx = 0;
  enemy.vx = approachValue(enemy.vx, 0, enemy.turnSpeed * brakeMultiplier * dt);
}

function moveEnemyByVelocity(enemy, dt) {
  enemy.x += enemy.vx * dt;
}

function moveEnemyInCurrentDirection(enemy, dt, speedOverride) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  const direction = enemy.patrolDirection || Math.sign(enemy.vx) || 1;
  const speed = speedOverride ?? getEnemyPatrolSpeed(enemy);
  accelerateEnemyTowards(enemy, direction * speed, dt);
  moveEnemyByVelocity(enemy, dt);
}

function flipEnemyPatrolDirection(enemy) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.patrolDirection *= -1;
  if (enemy.patrolDirection === 0) {
    enemy.patrolDirection = -1;
  }
}

function tryEnemyPatrolTurn(enemy, pauseTime = 0) {
  if (enemy.x <= enemy.left || enemy.x + enemy.w >= enemy.right) {
    enemy.x = clamp(enemy.x, enemy.left, enemy.right - enemy.w);
    flipEnemyPatrolDirection(enemy);
    if (pauseTime > 0) {
      setEnemyState(enemy, "idle", pauseTime);
    }
    return true;
  }
  return false;
}

function beginEnemyWindup(enemy, anticipationTime, direction, actionConfig) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.patrolDirection = direction || enemy.patrolDirection || 1;
  enemy.pendingAction = actionConfig;
  setEnemyState(enemy, "windup", anticipationTime);
}

function beginEnemyPause(enemy, pauseTime, direction, burstTime, speed, cooldown) {
  beginEnemyWindup(enemy, pauseTime, direction, {
    type: "burst",
    burstTime,
    speed,
    cooldown,
    recoveryTime: enemy.type === "demon" ? 0.28 : enemy.type === "oracle" || enemy.type === "revenant" ? 0.22 : 0.18
  });
}

function beginEnemyRecovery(enemy, recoveryTime) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.pendingAction = null;
  setEnemyState(enemy, "recover", recoveryTime);
}

function beginEnemyStagger(enemy, staggerTime) {
  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }
  enemy.pendingAction = null;
  setEnemyState(enemy, "stagger", staggerTime);
}

function resolveEnemyWindup(enemy) {
  const pendingAction = enemy.pendingAction;
  if (!pendingAction) {
    setEnemyState(enemy, "patrol");
    return false;
  }

  if (pendingAction.type === "burst") {
    enemy.actionCooldown = pendingAction.cooldown ?? enemy.actionCooldown;
    enemy.maxSpeed = pendingAction.speed ?? enemy.maxSpeed;
    setEnemyState(enemy, "burst", pendingAction.burstTime ?? 0.2);
    return true;
  }

  if (pendingAction.type === "blink") {
    enemy.actionCooldown = pendingAction.cooldown ?? enemy.actionCooldown;
    enemy.pendingBlinkOffset = pendingAction.offset ?? 0;
    enemy.pendingAction = {
      ...pendingAction,
      type: "postBlink"
    };
    setEnemyState(enemy, "burst", pendingAction.travelTime ?? 0.1);
    return true;
  }

  setEnemyState(enemy, "patrol");
  return false;
}

function resolveEnemyRecovery(enemy) {
  setEnemyState(enemy, "patrol");
}

function createInitialState() {
  return {
    levelName: "Eclipse Keep",
    world: "Light",
    element: "None",
    worldWidth: 4040,
    floorY: 620,
    gravity: 1900,
    camera: {
      x: 0,
      smooth: 0.12
    },
    abilityUnlocked: {
      Dash: false,
      ShadowSwap: true,
      FireShift: true,
      IceShift: true,
      WindShift: true
    },
    messageTimer: 0,
    started: false,
    gameWon: false,
    isDead: false,
    bossIntroShown: false,
    debugInvulnerable: false,
    activeCheckpointId: "start",
    savedCheckpointId: "start",
    nearbyCheckpointId: null,
    combat: {
      hitStop: 0,
      screenShake: 0,
      screenShakeStrength: 0
    },
    particles: [],
    slashEffects: [],
    player: {
      x: 120,
      y: 540,
      w: 42,
      h: 64,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      onWall: false,
      wallDirection: 0,
      moveSpeed: 320,
      jumpForce: 760,
      dashSpeed: 760,
      dashDuration: 0.14,
      dashTimer: 0,
      dashCooldown: 0,
      dashCooldownDuration: 0.35,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      wallSlideSpeed: 170,
      wallJumpLock: 0,
      jumpReleased: false,
      jumpCutReady: false,
      jumpCutMultiplier: 0.48,
      hp: 5,
      maxHp: 5,
      displayHp: 5,
      invuln: 0,
      hurtFlash: 0,
      attackTimer: 0,
      attackCooldown: 0,
      attackRecover: 0,
      weaponStage: 0,
      comboStep: -1,
      comboChainTimer: 0,
      queuedAttack: false,
      attackType: "normal",
      attackProfileId: "combo-1",
      pogoGraceTimer: 0
    },
    enemies: [
      {
        type: "goblin",
        name: "Keep Skulk",
        x: 1340,
        y: 562,
        w: 46,
        h: 58,
        vx: 110,
        left: 1240,
        right: 1520,
        hp: 2,
        displayHp: 2,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 0,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 0.3,
        baseSpeed: 98,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "watcher",
        name: "Moon Watcher",
        x: 1760,
        y: 336,
        w: 40,
        h: 48,
        vx: 74,
        left: 1680,
        right: 1880,
        hp: 2,
        displayHp: 2,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 1.4,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 1.1,
        baseSpeed: 58,
        baseY: 336,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "demon",
        name: "Ash Demon",
        x: 2080,
        y: 560,
        w: 50,
        h: 60,
        vx: 92,
        left: 2000,
        right: 2200,
        hp: 4,
        displayHp: 4,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 1.6,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 0.9,
        baseSpeed: 64,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "shadowWalker",
        name: "Chain Warden",
        x: 2440,
        y: 432,
        w: 46,
        h: 58,
        vx: 120,
        left: 2340,
        right: 2580,
        hp: 3,
        displayHp: 3,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 1.4,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 1.1,
        baseSpeed: 112,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "watcher",
        name: "Void Watcher",
        x: 2840,
        y: 322,
        w: 40,
        h: 48,
        vx: 72,
        left: 2740,
        right: 3000,
        hp: 3,
        displayHp: 3,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 1.1,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 0.7,
        baseSpeed: 62,
        baseY: 322,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "shadowWalker",
        name: "Shadow Walker",
        x: 3140,
        y: 562,
        w: 46,
        h: 58,
        vx: 112,
        left: 3060,
        right: 3260,
        hp: 3,
        displayHp: 3,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 1.1,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 0.7,
        baseSpeed: 86,
        contactDamage: 1,
        alive: true,
        contactCooldown: 0
      },
      {
        type: "oracle",
        name: "Eclipse Lord",
        x: 3600,
        y: 500,
        w: 84,
        h: 104,
        vx: -66,
        left: 3420,
        right: 3940,
        hp: 16,
        displayHp: 16,
        invuln: 0,
        hurtTimer: 0,
        knockbackTimer: 0,
        behaviorTimer: 0.8,
        pauseTimer: 0,
        burstTimer: 0,
        alertCooldown: 0.8,
        baseSpeed: 68,
        contactDamage: 2,
        awakened: false,
        boss: true,
        alive: true,
        contactCooldown: 0
      }
    ],
    pickups: {
      dash: { x: 880, y: 574, w: 28, h: 28, active: true, label: "Dash Core" },
      weapon: { x: 2580, y: 354, w: 28, h: 28, active: true, label: "Umbral Fang" }
    },
    checkpoints: [
      { id: "start", x: 120, y: 540, w: 28, h: 72, label: "Outer Rampart", active: true },
      { id: "gate", x: 1120, y: 548, w: 28, h: 72, label: "Ash Gate", active: false },
      { id: "sanctum", x: 2540, y: 338, w: 28, h: 72, label: "Umbral Galleries", active: false },
      { id: "boss", x: 3460, y: 548, w: 28, h: 72, label: "Eclipse Throne", active: false }
    ],
    gate: {
      x: 1030,
      y: 460,
      w: 34,
      h: 160,
      active: true,
      requiredAbility: "Dash"
    },
    barrier: {
      x: 2280,
      y: 520,
      w: 40,
      h: 100,
      active: true
    },
    exitZone: {
      x: 3960,
      y: 430,
      w: 60,
      h: 190
    },
    platforms: [
      { x: 0, y: 620, w: 420, h: 100, type: "ground" },
      { x: 520, y: 620, w: 260, h: 100, type: "ground" },
      { x: 920, y: 620, w: 220, h: 100, type: "ground" },
      { x: 1280, y: 620, w: 200, h: 100, type: "ground" },
      { x: 1600, y: 620, w: 220, h: 100, type: "ground" },
      { x: 1980, y: 620, w: 260, h: 100, type: "ground" },
      { x: 2400, y: 620, w: 160, h: 100, type: "ground" },
      { x: 2740, y: 620, w: 260, h: 100, type: "ground" },
      { x: 3160, y: 620, w: 180, h: 100, type: "ground" },
      { x: 3420, y: 620, w: 620, h: 100, type: "ground" },
      { x: 240, y: 530, w: 120, h: 16, type: "ledge" },
      { x: 670, y: 470, w: 96, h: 16, type: "ledge" },
      { x: 1180, y: 538, w: 84, h: 16, type: "ledge" },
      { x: 1480, y: 470, w: 86, h: 16, type: "ledge" },
      { x: 1750, y: 406, w: 100, h: 16, type: "ledge" },
      { x: 2050, y: 354, w: 94, h: 16, type: "ledge" },
      { x: 2360, y: 420, w: 110, h: 16, type: "ledge" },
      { x: 2580, y: 340, w: 110, h: 16, type: "ledge" },
      { x: 2230, y: 500, w: 90, h: 16, type: "ledge" },
      { x: 2870, y: 430, w: 120, h: 16, type: "ledge" },
      { x: 3200, y: 380, w: 120, h: 16, type: "ledge" },
      { x: 3520, y: 470, w: 120, h: 16, type: "ledge" },
      { x: 3740, y: 410, w: 120, h: 16, type: "ledge" }
    ],
    shadowPlatforms: [
      { x: 430, y: 470, w: 78, h: 14, world: "Shadow" },
      { x: 802, y: 544, w: 94, h: 14, world: "Shadow" },
      { x: 1080, y: 492, w: 74, h: 14, world: "Shadow" },
      { x: 1548, y: 424, w: 84, h: 14, world: "Shadow" },
      { x: 1858, y: 320, w: 90, h: 14, world: "Shadow" },
      { x: 2172, y: 446, w: 96, h: 14, world: "Shadow" },
      { x: 2480, y: 394, w: 110, h: 14, world: "Shadow" },
      { x: 2700, y: 302, w: 110, h: 14, world: "Shadow" },
      { x: 3348, y: 338, w: 96, h: 14, world: "Shadow" },
      { x: 3648, y: 308, w: 96, h: 14, world: "Shadow" }
    ],
    hazards: [
      { x: 468, y: 604, w: 34, h: 16, damage: 1, kind: "spikes" },
      { x: 1148, y: 604, w: 96, h: 16, damage: 1, kind: "spikes" },
      { x: 1548, y: 604, w: 54, h: 16, damage: 1, kind: "spikes" },
      { x: 2198, y: 604, w: 164, h: 16, damage: 1, kind: "spikes" },
      { x: 3010, y: 604, w: 90, h: 16, damage: 1, kind: "spikes" },
      { x: 3370, y: 604, w: 74, h: 16, damage: 1, kind: "spikes" }
    ],
    walls: [
      { x: 1120, y: 430, w: 30, h: 190 },
      { x: 1888, y: 300, w: 30, h: 320 },
      { x: 2428, y: 280, w: 36, h: 340 },
      { x: 3040, y: 280, w: 36, h: 340 },
      { x: 3500, y: 280, w: 36, h: 340 },
      { x: 3960, y: 280, w: 36, h: 340 }
    ]
  };
}

function getDefaultProgress() {
  return {
    dashUnlocked: false,
    weaponStage: 0,
    checkpointId: "start"
  };
}

function loadProgress() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return getDefaultProgress();
    }
    const parsed = JSON.parse(raw);
    return {
      dashUnlocked: Boolean(parsed.dashUnlocked),
      weaponStage: parsed.weaponStage >= 1 ? 1 : 0,
      checkpointId: typeof parsed.checkpointId === "string" ? parsed.checkpointId : "start"
    };
  } catch (_error) {
    return getDefaultProgress();
  }
}

function saveProgress() {
  try {
    const payload = {
      dashUnlocked: state.abilityUnlocked.Dash,
      weaponStage: state.player.weaponStage,
      checkpointId: state.savedCheckpointId
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures so the prototype remains playable in restricted contexts.
  }
}

function applyPersistedProgress(targetState) {
  const progress = loadProgress();
  targetState.abilityUnlocked.Dash = progress.dashUnlocked;
  targetState.player.weaponStage = progress.weaponStage;
  targetState.pickups.dash.active = !progress.dashUnlocked;
  targetState.pickups.weapon.active = progress.weaponStage < 1;
  setSavedCheckpoint(targetState, progress.checkpointId, false);
  spawnPlayerAtCheckpoint(targetState, targetState.player, "start");
}

function setSavedCheckpoint(targetState, checkpointId, shouldSave = true) {
  let resolvedCheckpointId = "start";
  for (const checkpoint of targetState.checkpoints) {
    checkpoint.active = checkpoint.id === checkpointId;
    if (checkpoint.active) {
      resolvedCheckpointId = checkpoint.id;
    }
  }
  targetState.savedCheckpointId = resolvedCheckpointId;
  targetState.activeCheckpointId = resolvedCheckpointId;
  if (shouldSave && targetState === state) {
    saveProgress();
  }
}

function getCheckpointById(targetState, checkpointId) {
  return targetState.checkpoints.find((checkpoint) => checkpoint.id === checkpointId) ?? targetState.checkpoints[0];
}

function spawnPlayerAtCheckpoint(targetState, player, checkpointId) {
  const checkpoint = getCheckpointById(targetState, checkpointId);
  player.x = checkpoint.x - 18;
  player.y = checkpoint.y - 8;
  player.vx = 0;
  player.vy = 0;
}

function handleKeyDown(code) {
  const player = state.player;

  if (code === "Space") {
    player.jumpBufferTimer = 0.16;
  }

  if ((code === "ShiftLeft" || code === "ShiftRight") && state.abilityUnlocked.Dash) {
    tryDash();
  }

  if (code === "KeyF") {
    tryAttack();
  }

  if (code === "KeyE" && state.abilityUnlocked.ShadowSwap) {
    state.world = state.world === "Light" ? "Shadow" : "Light";
    showMessage(`World shifted to ${state.world}`);
  }

  if (code === "KeyR") {
    tryRestAtCheckpoint();
  }

  if (code === "KeyI") {
    toggleInvulnerability();
  }

  if (code === "Digit1" && state.abilityUnlocked.FireShift) {
    state.element = "Fire";
  }
  if (code === "Digit2" && state.abilityUnlocked.IceShift) {
    state.element = "Ice";
    showMessage("Ice stance active");
  }
  if (code === "Digit3" && state.abilityUnlocked.WindShift) {
    state.element = "Wind";
    showMessage("Wind stance active");
  }
  if (code === "Digit0") {
    state.element = "None";
  }
}

function handleTouchAction(action) {
  const player = state.player;

  if (action === "jump") {
    player.jumpBufferTimer = 0.16;
    return;
  }

  if (action === "attack") {
    tryAttack();
    return;
  }

  if (action === "dash") {
    if (state.abilityUnlocked.Dash) {
      tryDash();
    }
    return;
  }

  if (action === "swap") {
    if (state.abilityUnlocked.ShadowSwap) {
      state.world = state.world === "Light" ? "Shadow" : "Light";
      showMessage(`World shifted to ${state.world}`);
    }
    return;
  }

  if (action === "rest") {
    tryRestAtCheckpoint();
    return;
  }

  if (action === "element") {
    cycleElement();
  }
}

function cycleElement() {
  const order = ["None", "Fire", "Ice", "Wind"];
  let index = order.indexOf(state.element);

  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(index + i) % order.length];
    if (candidate === "None") {
      state.element = "None";
      showMessage("Element cleared");
      return;
    }
    if (candidate === "Fire" && state.abilityUnlocked.FireShift) {
      state.element = "Fire";
      showMessage("Fire stance active");
      return;
    }
    if (candidate === "Ice" && state.abilityUnlocked.IceShift) {
      state.element = "Ice";
      showMessage("Ice stance active");
      return;
    }
    if (candidate === "Wind" && state.abilityUnlocked.WindShift) {
      state.element = "Wind";
      showMessage("Wind stance active");
      return;
    }
  }
}

function showMessage(message, seconds = 2.2) {
  state.messageTimer = seconds;
  hud.overlay.textContent = message;
  hud.overlay.classList.remove("hidden");
}

function hideMessage() {
  state.messageTimer = 0;
  hud.overlay.classList.add("hidden");
}

function startRun() {
  if (state.started) {
    return;
  }
  state.started = true;
  hud.startOverlay.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, "start");
  showMessage("Collect Dash, cross the gate, rest at shrines, burn the barrier, reach the exit", 4);
}

function showDeathOverlay(reason) {
  state.isDead = true;
  hud.deathReason.textContent = reason;
  hud.deathOverlay.classList.remove("hidden");
}

function hideDeathOverlay() {
  state.isDead = false;
  hud.deathOverlay.classList.add("hidden");
}

function showWinOverlay(reason) {
  hud.winReason.textContent = reason;
  hud.winOverlay.classList.remove("hidden");
}

function hideWinOverlay() {
  hud.winOverlay.classList.add("hidden");
}

function toggleInvulnerability() {
  state.debugInvulnerable = !state.debugInvulnerable;
  showMessage(`Invulnerability ${state.debugInvulnerable ? "enabled" : "disabled"}`);
}

function tryRestAtCheckpoint() {
  const checkpointId = state.nearbyCheckpointId;
  if (!checkpointId) {
    showMessage("Stand at a shrine to rest");
    return false;
  }

  const checkpoint = getCheckpointById(state, checkpointId);
  setSavedCheckpoint(state, checkpointId);
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  state.player.invuln = 0.3;
  showMessage(`Rested at ${checkpoint.label}`);
  spawnImpactParticles(checkpoint.x + checkpoint.w * 0.5, checkpoint.y + 14, "#efe0b1", 12, 0.8);
  return true;
}

function restartLevelFromBeginning(message = "The warrior returns to the gate") {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  initializeStateRuntime(state);
  applyPersistedProgress(state);
  state.started = true;
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  hideWinOverlay();
  hideDeathOverlay();
  hideMessage();
  hud.startOverlay.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, "start");
  showMessage(message, 3);
}

function respawnFromSavedCheckpoint(message = "The warrior rises again") {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  initializeStateRuntime(state);
  applyPersistedProgress(state);
  state.started = true;
  state.player.hp = state.player.maxHp;
  state.player.displayHp = state.player.maxHp;
  hideWinOverlay();
  hideDeathOverlay();
  hideMessage();
  hud.startOverlay.classList.add("hidden");
  spawnPlayerAtCheckpoint(state, state.player, state.savedCheckpointId);
  showMessage(message, 2.8);
}

function tryDash() {
  const player = state.player;
  if (player.dashCooldown > 0 || player.dashTimer > 0) {
    return;
  }

  player.dashTimer = player.dashDuration;
  player.dashCooldown = player.dashCooldownDuration;
  player.vx = player.facing * player.dashSpeed;
  player.vy = 0;
  showMessage("Dash");
}

function getVerticalAim() {
  return (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0)
    - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
}

// Attack profiles keep combo/pogo tuning centralized and easy to iterate on.
function getAttackProfile(player, mode = "auto") {
  const isDownslash = mode === "downslash" || (mode === "auto" && !player.onGround && getVerticalAim() > 0);
  const attackWidth = getAttackWidth();

  if (isDownslash) {
    return {
      id: "downslash",
      type: "downslash",
      damageBonus: 0,
      width: Math.max(42, attackWidth - 18),
      height: 58,
      offsetX: -(Math.max(42, attackWidth - 18) - player.w) * 0.5,
      offsetY: player.h - 8,
      attackTime: 0.13,
      cooldown: 0.16,
      recover: 0.08,
      forwardBoost: 0,
      knockback: 180,
      comboWindow: 0,
      queueWindow: 0,
      bounceStrength: 590,
      slashColor: state.element === "Fire" ? "#ffbf90" : state.element === "Ice" ? "#c9f3ff" : "#f2f0ea"
    };
  }

  const comboIndex = player.comboChainTimer > 0 ? Math.min(player.comboStep + 1, 2) : 0;
  const comboProfiles = [
    { id: "combo-1", damageBonus: 0, width: attackWidth, height: 44, offsetX: null, offsetY: 12, attackTime: 0.1, cooldown: 0.2, recover: 0.11, forwardBoost: 90, knockback: 240, comboWindow: 0.3, queueWindow: 0.09, finisher: false },
    { id: "combo-2", damageBonus: 0, width: attackWidth + 10, height: 46, offsetX: null, offsetY: 10, attackTime: 0.11, cooldown: 0.19, recover: 0.12, forwardBoost: 110, knockback: 285, comboWindow: 0.28, queueWindow: 0.085, finisher: false },
    { id: "combo-3", damageBonus: 1, width: attackWidth + 22, height: 50, offsetX: null, offsetY: 8, attackTime: 0.13, cooldown: 0.28, recover: 0.16, forwardBoost: 135, knockback: 360, comboWindow: 0, queueWindow: 0, finisher: true }
  ];
  const profile = { ...comboProfiles[comboIndex] };
  profile.type = "combo";
  profile.comboIndex = comboIndex;
  profile.offsetX = player.facing > 0 ? player.w : -profile.width;
  profile.slashColor = state.element === "Fire" ? "#ffb388" : state.element === "Ice" ? "#bfefff" : "#f5eee2";
  return profile;
}

function getAttackProfileById(player, profileId) {
  if (profileId === "downslash") {
    return getAttackProfile(player, "downslash");
  }
  const comboProfiles = [
    { id: "combo-1", damageBonus: 0, width: getAttackWidth(), height: 44, offsetY: 12 },
    { id: "combo-2", damageBonus: 0, width: getAttackWidth() + 10, height: 46, offsetY: 10 },
    { id: "combo-3", damageBonus: 1, width: getAttackWidth() + 22, height: 50, offsetY: 8 }
  ];
  const profile = comboProfiles.find((entry) => entry.id === profileId) ?? comboProfiles[0];
  return {
    ...profile,
    type: "combo",
    offsetX: player.facing > 0 ? player.w : -profile.width,
    slashColor: state.element === "Fire" ? "#ffb388" : state.element === "Ice" ? "#bfefff" : "#f5eee2"
  };
}

function getCurrentAttackBox(player, profile) {
  return {
    x: player.x + profile.offsetX,
    y: player.y + profile.offsetY,
    w: profile.width,
    h: profile.height
  };
}

function canQueueComboAttack(player) {
  const profile = getAttackProfile(player, "normal");
  return player.attackType === "combo" && player.comboChainTimer > 0 && player.attackCooldown <= profile.queueWindow;
}

function tryAttack(mode = "auto") {
  const player = state.player;
  if (player.attackCooldown > 0) {
    if (mode === "auto" && canQueueComboAttack(player)) {
      player.queuedAttack = true;
    }
    return false;
  }

  const profile = getAttackProfile(player, mode);
  player.attackType = profile.type;
  player.attackProfileId = profile.id;
  player.attackCooldown = profile.cooldown;
  player.attackTimer = profile.attackTime;
  player.attackRecover = profile.recover;
  player.queuedAttack = false;
  player.comboChainTimer = profile.comboWindow;
  player.comboStep = profile.type === "combo" ? profile.comboIndex : -1;
  player.vx += player.facing * profile.forwardBoost;
  playAttackSound();

  const attackBox = getCurrentAttackBox(player, profile);
  spawnSlashTrail(attackBox, profile.type === "downslash" ? 1 : player.facing, profile.slashColor, profile.type);

  let landedHit = false;
  let pogoHit = false;

  for (const enemy of state.enemies) {
    if (!enemy.alive || !overlaps(attackBox, enemy) || enemy.invuln > 0) {
      continue;
    }

    const damage = getAttackDamage(profile);
    landedHit = true;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.invuln = 0.16;
    enemy.hurtTimer = 0.22;
    enemy.knockbackTimer = profile.finisher ? 0.22 : profile.type === "downslash" ? 0.18 : 0.16;
    enemy.vx = profile.type === "downslash" ? player.facing * 140 : player.facing * (profile.knockback + damage * 24);
    enemy.targetVx = 0;
    enemy.reactionTimer = profile.finisher ? 0.24 : profile.type === "downslash" ? 0.2 : 0.16;
    enemy.reactionType = profile.type === "downslash" ? "pogo" : profile.finisher ? "finisher" : "hit";
    beginEnemyStagger(enemy, profile.finisher ? (enemy.type === "demon" ? 0.28 : 0.22) : enemy.type === "demon" ? 0.18 : 0.14);
    applyHitStop(0.055, 6);
    spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, profile.slashColor, profile.finisher ? 12 : 8);
    showMessage(`${enemy.name} hit for ${damage}`);
    if (profile.type === "downslash") {
      pogoHit = true;
    }
    if (enemy.hp <= 0) {
      enemy.alive = false;
      applyHitStop(0.07, 8);
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#fff6dc", 12, 1.25);
      showMessage(`${enemy.name} defeated`);
    }
  }

  if (state.barrier.active && overlaps(attackBox, state.barrier)) {
    if (profile.type === "downslash") {
      landedHit = true;
      pogoHit = true;
      spawnImpactParticles(state.barrier.x + state.barrier.w * 0.5, state.barrier.y + 18, "#f7d8c4", 8, 0.9);
    } else if (state.element === "Fire") {
      state.barrier.active = false;
      landedHit = true;
      applyHitStop(0.045, 5);
      spawnImpactParticles(state.barrier.x + state.barrier.w * 0.5, state.barrier.y + 26, "#ff9f68", 12, 1.1);
      showMessage("Barrier burned away");
    } else {
      showMessage("Fire is needed here");
    }
  }

  if (profile.type === "downslash") {
    for (const hazard of state.hazards ?? []) {
      if (!overlaps(attackBox, hazard)) {
        continue;
      }
      landedHit = true;
      pogoHit = true;
      spawnImpactParticles(hazard.x + hazard.w * 0.5, hazard.y + 4, "#d8ecff", 8, 0.8);
      break;
    }
  }

  if (pogoHit) {
    applyPogoBounce(profile.bounceStrength);
  }

  if (!landedHit) {
    applyScreenShake(0.06, 1.8);
  }
  return landedHit;
}

function applyPogoBounce(strength) {
  const player = state.player;
  player.vy = -(state.element === "Wind" ? strength * 1.04 : strength);
  player.jumpCutReady = false;
  player.jumpReleased = false;
  player.pogoGraceTimer = 0.12;
  player.onGround = false;
  applyHitStop(0.035, 4);
  spawnImpactParticles(player.x + player.w * 0.5, player.y + player.h, "#f1f6ff", 8, 0.85);
}

function getAttackDamage(profile = null) {
  const baseDamage = state.player.weaponStage === 0 ? 1 : 2;
  return baseDamage + (profile?.damageBonus ?? 0);
}

function getAttackWidth() {
  return state.player.weaponStage === 0 ? 62 : 82;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function applyHitStop(duration, shakeStrength = 0) {
  state.combat.hitStop = Math.max(state.combat.hitStop, duration);
  applyScreenShake(duration * 8, shakeStrength);
}

function applyScreenShake(duration, strength) {
  state.combat.screenShake = Math.max(state.combat.screenShake, duration);
  state.combat.screenShakeStrength = Math.max(state.combat.screenShakeStrength, strength);
}

function spawnSlashTrail(attackBox, facing, color, slashType = "normal") {
  if (state.slashEffects.length >= MAX_SLASH_EFFECTS) {
    state.slashEffects.shift();
  }
  state.slashEffects.push({
    x: facing > 0 ? attackBox.x : attackBox.x + attackBox.w,
    y: attackBox.y + attackBox.h * 0.52,
    width: attackBox.w,
    height: attackBox.h + 14,
    facing,
    color,
    type: slashType,
    life: 0.14,
    maxLife: 0.14
  });
}

function spawnImpactParticles(x, y, color, count, speedMultiplier = 1) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) {
      state.particles.shift();
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = (70 + Math.random() * 150) * speedMultiplier;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.2 + Math.random() * 0.16,
      maxLife: 0.36,
      size: 2 + Math.random() * 3,
      gravity: 340,
      drag: 0.92,
      color
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
    if (effect.life <= 0) {
      state.slashEffects.splice(i, 1);
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];
    particle.life -= dt;
    if (particle.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }

    particle.vx *= particle.drag;
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
}

function update(dt) {
  updateCombatEffects(dt);

  if (!state.started) {
    updateDisplayValues(dt);
    updateHud();
    return;
  }

  if (state.combat.hitStop > 0) {
    updateDisplayValues(dt);
    updateHud();
    return;
  }

  if (state.gameWon || state.isDead) {
    updateHud();
    return;
  }

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) {
      hud.overlay.classList.add("hidden");
    }
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateHazards();
  updateCheckpoints();
  updatePickups();
  updateGate();
  updateCamera(dt);
  updateDisplayValues(dt);
  updateHud();
}

function updatePlayer(dt) {
  const player = state.player;

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
  player.pogoGraceTimer -= dt;

  const moveAxis = getMoveAxis();
  if (moveAxis !== 0) {
    player.facing = moveAxis;
  }

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
  } else {
    const moveSpeed = state.element === "Wind" ? player.moveSpeed * 1.18 : player.moveSpeed;
    let targetSpeed = moveAxis * moveSpeed;
    if (player.attackRecover > 0 && player.wallJumpLock <= 0) {
      targetSpeed += player.facing * 85;
    }
    player.vx = player.wallJumpLock > 0 ? player.vx : targetSpeed;
    player.vy += getGravity() * dt;
  }

  const jumpPressed = player.jumpBufferTimer > 0;
  const wallData = getWallTouch(player);
  player.onWall = wallData.touching;
  player.wallDirection = wallData.direction;

  if (jumpPressed && player.coyoteTimer > 0) {
    player.vy = -getJumpForce();
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
    player.onGround = false;
    player.jumpCutReady = true;
  } else if (jumpPressed && player.onWall && !player.onGround) {
    player.vx = -player.wallDirection * 360;
    player.vy = -getJumpForce() * 0.96;
    player.jumpBufferTimer = 0;
    player.wallJumpLock = 0.12;
    player.jumpCutReady = true;
    showMessage("Wall jump");
  }

  if (player.onWall && !player.onGround && player.vy > state.player.wallSlideSpeed) {
    player.vy = state.player.wallSlideSpeed;
  }

  if (player.jumpReleased && player.jumpCutReady && player.vy < -120) {
    player.vy *= player.jumpCutMultiplier;
    player.jumpCutReady = false;
  }
  player.jumpReleased = false;

  moveHorizontally(player, dt);
  moveVertically(player, dt);

  if (player.queuedAttack && player.attackCooldown <= 0.05) {
    tryAttack("normal");
  }

  if (player.comboChainTimer <= 0 && player.attackCooldown <= 0) {
    player.comboStep = -1;
    player.queuedAttack = false;
    player.attackType = "normal";
    player.attackProfileId = "combo-1";
  }

  if (player.y > canvas.height + 220) {
    resetRun("You fell into the abyss");
  }

  if (hasBossAlive() && player.x > 3440 && !state.bossIntroShown) {
    state.bossIntroShown = true;
    showMessage("The Eclipse Lord awakens");
  }

  if (!state.gate.active && !hasBossAlive() && overlaps(player, state.exitZone)) {
    state.gameWon = true;
    showMessage("Vertical slice cleared", 4);
    showWinOverlay("You broke the Eclipse Lord and survived the fivefold descent into Shadow Shift.");
  }
}

function getMoveAxis() {
  return (keys.has("KeyD") || keys.has("ArrowRight") || touchState.right ? 1 : 0)
    - (keys.has("KeyA") || keys.has("ArrowLeft") || touchState.left ? 1 : 0);
}

function getJumpForce() {
  return state.element === "Wind" ? state.player.jumpForce * 1.08 : state.player.jumpForce;
}

function getGravity() {
  return state.element === "Wind" ? state.gravity * 0.84 : state.gravity;
}

function moveHorizontally(player, dt) {
  player.x += player.vx * dt;

  for (const solid of getSolids()) {
    if (!overlaps(player, solid)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = solid.x - player.w;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.w;
    }
    player.vx = 0;
  }

  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x + player.w > state.worldWidth) {
    player.x = state.worldWidth - player.w;
  }
}

function moveVertically(player, dt) {
  player.y += player.vy * dt;
  player.onGround = false;

  for (const solid of getSolids()) {
    if (!overlaps(player, solid)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = solid.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.coyoteTimer = 0.12;
      player.jumpCutReady = false;
    } else if (player.vy < 0) {
      player.y = solid.y + solid.h;
      player.vy = 0;
      player.jumpCutReady = false;
    }
  }
}

function getWallTouch(player) {
  const leftProbe = { x: player.x - 4, y: player.y + 8, w: 4, h: player.h - 16 };
  const rightProbe = { x: player.x + player.w, y: player.y + 8, w: 4, h: player.h - 16 };

  for (const solid of getSolids()) {
    if (overlaps(leftProbe, solid)) {
      return { touching: true, direction: -1 };
    }
    if (overlaps(rightProbe, solid)) {
      return { touching: true, direction: 1 };
    }
  }

  return { touching: false, direction: 0 };
}

function getSolids() {
  const solids = [...state.platforms, ...state.walls];
  for (const platform of state.shadowPlatforms) {
    if (state.world === platform.world) {
      solids.push(platform);
    }
  }
  if (state.barrier.active) {
    solids.push(state.barrier);
  }
  if (state.gate.active) {
    solids.push(state.gate);
  }
  return solids;
}

function updateHazards() {
  if (state.debugInvulnerable) {
    return;
  }

  if (state.player.invuln > 0 || state.player.pogoGraceTimer > 0) {
    return;
  }

  for (const hazard of state.hazards ?? []) {
    if (!overlaps(state.player, hazard)) {
      continue;
    }

    state.player.hp = Math.max(0, state.player.hp - (hazard.damage ?? 1));
    state.player.invuln = 0.55;
    state.player.hurtFlash = 0.28;
    state.player.vy = -210;
    state.player.vx = state.player.facing >= 0 ? -220 : 220;
    playHitSound();
    applyHitStop(0.04, 5);
    spawnImpactParticles(state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.8, "#dff3ff", 8, 0.9);
    showMessage("The ice tore through you");
    if (state.player.hp <= 0) {
      handleDeath("You Died", "The cold ruins claimed you");
    }
    break;
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }

    enemy.invuln -= dt;
    enemy.hurtTimer -= dt;
    enemy.knockbackTimer -= dt;
    enemy.actionCooldown -= dt;
    enemy.stateTimer -= dt;
    enemy.contactCooldown -= dt;
    enemy.reactionTimer -= dt;
    if (enemy.reactionTimer <= 0) {
      enemy.reactionType = "none";
    }
    updateEnemyBehavior(enemy, dt);

    if (overlaps(state.player, enemy) && state.player.invuln <= 0 && enemy.contactCooldown <= 0) {
      if (state.debugInvulnerable) {
        enemy.contactCooldown = 0.15;
        continue;
      }
      const damage = enemy.contactDamage ?? 1;
      state.player.hp = Math.max(0, state.player.hp - damage);
      state.player.invuln = 0.55;
      state.player.hurtFlash = 0.28;
      const knockback = enemy.type === "demon" ? 320 : enemy.type === "watcher" ? 210 : 240;
      state.player.vx = state.player.x + state.player.w * 0.5 < enemy.x + enemy.w * 0.5 ? -knockback : knockback;
      state.player.vy = enemy.type === "watcher" ? -120 : -180;
      enemy.contactCooldown = getEnemyContactCooldown(enemy);
      playHitSound();
      applyHitStop(enemy.type === "demon" ? 0.055 : 0.04, enemy.type === "demon" ? 9 : 7);
      spawnImpactParticles(state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.4, "#ffffff", 8, 0.9);
      showMessage(`${enemy.name} struck you${damage > 1 ? ` for ${damage}` : ""}`);
      if (state.player.hp <= 0) {
        handleDeath("You Died", "The shadows overwhelmed you");
        return;
      }
    }
  }
}

function updateEnemyBehavior(enemy, dt) {
  if (enemy.type === "watcher") {
    updateWatcherHeight(enemy, dt);
  }

  if (enemy.knockbackTimer > 0 && getEnemyState(enemy) !== "stagger") {
    moveEnemyByVelocity(enemy, dt);
    enemy.vx *= enemy.type === "demon" ? 0.9 : 0.88;
    clampEnemyToPatrol(enemy);
    return;
  }

  if (enemy.state == null) {
    initializeEnemyRuntime(enemy);
  }

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const enemyCenterX = enemy.x + enemy.w * 0.5;
  const horizontalDistance = Math.abs(playerCenterX - enemyCenterX);
  const facingToPlayer = Math.sign(playerCenterX - enemyCenterX) || enemy.patrolDirection || 1;

  if (enemy.type === "oracle") {
    updateOracleBehavior(enemy, dt, horizontalDistance, facingToPlayer);
    return;
  }

  if (enemy.type === "revenant") {
    updateRevenantBehavior(enemy, dt, horizontalDistance, facingToPlayer);
    return;
  }

  const currentState = getEnemyState(enemy);

  if (currentState === "idle") {
    brakeEnemy(enemy, dt, 1.15);
    if (enemy.stateTimer <= 0) {
      setEnemyState(enemy, "patrol");
    }
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, enemy.type === "demon" ? 1.25 : 1.1);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) {
      beginEnemyRecovery(enemy, enemy.type === "demon" ? 0.16 : 0.1);
    }
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, enemy.type === "demon" ? 1.35 : 1.1);
    if (enemy.stateTimer <= 0) {
      resolveEnemyWindup(enemy);
    }
    return;
  }

  if (currentState === "burst") {
    const pendingAction = enemy.pendingAction;
    if (pendingAction?.type === "burst") {
      accelerateEnemyTowards(enemy, enemy.patrolDirection * pendingAction.speed, dt);
      moveEnemyByVelocity(enemy, dt);
    } else if (pendingAction?.type === "postBlink") {
      const blinkOffset = enemy.pendingBlinkOffset || 0;
      enemy.x = clamp(enemy.x + blinkOffset, enemy.left, enemy.right - enemy.w);
      enemy.pendingBlinkOffset = 0;
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.4, "#a9e7ff", 10, 0.85);
      applyScreenShake(0.05, 1.5);
      enemy.pendingAction = {
        type: "burst",
        speed: pendingAction.speed,
        recoveryTime: pendingAction.recoveryTime ?? 0.18
      };
      accelerateEnemyTowards(enemy, enemy.patrolDirection * pendingAction.speed, dt);
      moveEnemyByVelocity(enemy, dt);
    } else {
      moveEnemyByVelocity(enemy, dt);
    }
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) {
      beginEnemyRecovery(enemy, pendingAction?.recoveryTime ?? 0.16);
    }
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.05);
    if (enemy.stateTimer <= 0) {
      resolveEnemyRecovery(enemy);
    }
    return;
  }

  if (currentState === "patrol") {
    if (enemy.type === "goblin" && horizontalDistance < 170 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.16, facingToPlayer, {
        type: "burst",
        burstTime: 0.22,
        speed: 255,
        cooldown: 1.05,
        recoveryTime: 0.2
      });
      return;
    }

    if (enemy.type === "shadowWalker" && horizontalDistance < 210 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.28, facingToPlayer, {
        type: "burst",
        burstTime: 0.38,
        speed: 210,
        cooldown: 1.8,
        recoveryTime: 0.18
      });
      return;
    }

    if (enemy.type === "demon" && horizontalDistance < 235 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.42, facingToPlayer, {
        type: "burst",
        burstTime: 0.54,
        speed: 285,
        cooldown: 2.3,
        recoveryTime: 0.3
      });
      return;
    }

    if (enemy.type === "watcher" && horizontalDistance < 250 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.22, facingToPlayer, {
        type: "blink",
        offset: facingToPlayer * clamp(horizontalDistance * 0.45, 56, 96),
        travelTime: 0.1,
        burstTime: 0.2,
        speed: 164,
        cooldown: 2.1,
        recoveryTime: 0.24
      });
      return;
    }

    moveEnemyInCurrentDirection(enemy, dt);
    if (enemy.type === "shadowWalker") {
      tryEnemyPatrolTurn(enemy, 0.18);
    } else if (enemy.type === "demon") {
      tryEnemyPatrolTurn(enemy, 0.28);
    } else {
      tryEnemyPatrolTurn(enemy);
    }
  }
}

function updateOracleBehavior(enemy, dt, horizontalDistance, facingToPlayer) {
  const arenaWakeX = 2860;
  const currentState = getEnemyState(enemy);

  if (currentState === "idle" && !enemy.awakened) {
    enemy.vx = 0;
    if (state.player.x >= arenaWakeX || horizontalDistance < 280) {
      enemy.awakened = true;
      enemy.patrolDirection = facingToPlayer;
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#a8dfff", 22, 1.1);
      applyScreenShake(0.14, 4.5);
      beginEnemyWindup(enemy, 0.2, facingToPlayer, {
        type: "blink",
        offset: facingToPlayer * 120,
        travelTime: 0.1,
        burstTime: 0.22,
        speed: 220,
        cooldown: 1.45,
        recoveryTime: 0.22
      });
    }
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, 1.08);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) {
      beginEnemyRecovery(enemy, 0.12);
    }
    return;
  }

  if (currentState === "idle" && enemy.awakened) {
    brakeEnemy(enemy, dt, 1.1);
    if (enemy.stateTimer <= 0) {
      setEnemyState(enemy, "patrol");
    }
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, 1.2);
    if (enemy.stateTimer <= 0) {
      resolveEnemyWindup(enemy);
    }
    return;
  }

  if (currentState === "burst") {
    const pendingAction = enemy.pendingAction;
    if (pendingAction?.type === "postBlink") {
      const blinkOffset = enemy.pendingBlinkOffset || 0;
      enemy.x = clamp(enemy.x + blinkOffset, enemy.left, enemy.right - enemy.w);
      enemy.pendingBlinkOffset = 0;
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.4, "#9fdfff", 14, 0.8);
      enemy.pendingAction = {
        type: "burst",
        speed: pendingAction?.speed ?? 220,
        recoveryTime: pendingAction?.recoveryTime ?? 0.22
      };
    }
    accelerateEnemyTowards(enemy, enemy.patrolDirection * (enemy.pendingAction?.speed ?? 220), dt);
    moveEnemyByVelocity(enemy, dt);
    if (Math.random() < 0.14) {
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#a5ddff", 2, 0.25);
    }
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) {
      beginEnemyRecovery(enemy, enemy.pendingAction?.recoveryTime ?? 0.2);
    }
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.08);
    if (enemy.stateTimer <= 0) {
      resolveEnemyRecovery(enemy);
    }
    return;
  }

  if (horizontalDistance < 360 && enemy.actionCooldown <= 0) {
    beginEnemyWindup(enemy, 0.28, facingToPlayer, {
      type: "blink",
      offset: facingToPlayer * 120,
      travelTime: 0.1,
      burstTime: 0.22,
      speed: 220,
      cooldown: 1.45,
      recoveryTime: 0.22
    });
    return;
  }

  moveEnemyInCurrentDirection(enemy, dt, enemy.baseSpeed);
  tryEnemyPatrolTurn(enemy);
}

function updateRevenantBehavior(enemy, dt, horizontalDistance, facingToPlayer) {
  const arenaWakeX = 3000;
  const currentState = getEnemyState(enemy);

  if (currentState === "idle" && !enemy.awakened) {
    enemy.vx = 0;
    if (state.player.x >= arenaWakeX || horizontalDistance < 300) {
      enemy.awakened = true;
      enemy.patrolDirection = facingToPlayer;
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#d4ecff", 22, 1.15);
      applyScreenShake(0.14, 4.8);
      beginEnemyWindup(enemy, 0.24, facingToPlayer, {
        type: "burst",
        burstTime: 0.28,
        speed: 310,
        cooldown: 1.25,
        recoveryTime: 0.24
      });
    }
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, 1.08);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) {
      beginEnemyRecovery(enemy, 0.14);
    }
    return;
  }

  if (currentState === "idle" && enemy.awakened) {
    brakeEnemy(enemy, dt, 1.18);
    if (enemy.stateTimer <= 0) {
      setEnemyState(enemy, "patrol");
    }
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, 1.3);
    if (enemy.stateTimer <= 0) {
      const hadPendingAction = Boolean(enemy.pendingAction);
      resolveEnemyWindup(enemy);
      if (hadPendingAction) {
        spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.46, "#cde8ff", 12, 0.75);
      }
    }
    return;
  }

  if (currentState === "burst") {
    accelerateEnemyTowards(enemy, enemy.patrolDirection * (enemy.pendingAction?.speed ?? 310), dt);
    moveEnemyByVelocity(enemy, dt);
    if (Math.random() < 0.18) {
      spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.8, "#cfeeff", 2, 0.22);
    }
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) {
      beginEnemyRecovery(enemy, enemy.pendingAction?.recoveryTime ?? 0.24);
    }
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.08);
    if (enemy.stateTimer <= 0) {
      resolveEnemyRecovery(enemy);
    }
    return;
  }

  if (horizontalDistance < 380 && enemy.actionCooldown <= 0) {
    beginEnemyWindup(enemy, 0.2, facingToPlayer, {
      type: "burst",
      burstTime: 0.28,
      speed: 310,
      cooldown: 1.25,
      recoveryTime: 0.24
    });
    return;
  }

  moveEnemyInCurrentDirection(
    enemy,
    dt,
    enemy.baseSpeed + Math.sin(performance.now() * 0.006 + enemy.x * 0.01) * 12
  );
  tryEnemyPatrolTurn(enemy);
}

function updateWatcherHeight(enemy, dt) {
  const bob = Math.sin(performance.now() * 0.0045 + enemy.x * 0.012) * 12;
  const targetY = (enemy.baseY ?? enemy.y) + bob;
  enemy.y += (targetY - enemy.y) * Math.min(1, dt * 7.5);
}

function clampEnemyToPatrol(enemy) {
  if (enemy.x <= enemy.left || enemy.x + enemy.w >= enemy.right) {
    enemy.x = clamp(enemy.x, enemy.left, enemy.right - enemy.w);
    flipEnemyPatrolDirection(enemy);
    brakeEnemy(enemy, 1 / 60, 1.6);
    setEnemyState(enemy, "idle", enemy.type === "demon" ? 0.16 : enemy.type === "watcher" ? 0.12 : 0.1);
  }
}

function getEnemyPatrolSpeed(enemy) {
  if (enemy.type === "goblin") {
    return enemy.baseSpeed + Math.sin(performance.now() * 0.012 + enemy.x * 0.03) * 16;
  }
  if (enemy.type === "shadowWalker") {
    return enemy.baseSpeed;
  }
  if (enemy.type === "demon") {
    return enemy.baseSpeed;
  }
  if (enemy.type === "watcher") {
    return enemy.baseSpeed + Math.sin(performance.now() * 0.006 + enemy.x * 0.01) * 10;
  }
  if (enemy.type === "oracle") {
    return enemy.baseSpeed + Math.sin(performance.now() * 0.004 + enemy.x * 0.008) * 8;
  }
  if (enemy.type === "revenant") {
    return enemy.baseSpeed + Math.sin(performance.now() * 0.005 + enemy.x * 0.008) * 10;
  }
  return enemy.baseSpeed ?? 90;
}

function getEnemyContactCooldown(enemy) {
  if (enemy.type === "goblin") {
    return 0.28;
  }
  if (enemy.type === "shadowWalker") {
    return 0.5;
  }
  if (enemy.type === "demon") {
    return 0.72;
  }
  if (enemy.type === "watcher") {
    return 0.62;
  }
  if (enemy.type === "oracle") {
    return 0.72;
  }
  if (enemy.type === "revenant") {
    return 0.82;
  }
  return 0.45;
}

function hasBossAlive() {
  return state.enemies.some((enemy) => enemy.boss && enemy.alive);
}

function updateDisplayValues(dt) {
  state.player.displayHp += (state.player.hp - state.player.displayHp) * Math.min(1, dt * 10);

  for (const enemy of state.enemies) {
    enemy.displayHp += (enemy.hp - enemy.displayHp) * Math.min(1, dt * 10);
  }
}

function updatePickups() {
  const player = state.player;

  if (state.pickups.dash.active && overlaps(player, state.pickups.dash)) {
    state.pickups.dash.active = false;
    state.abilityUnlocked.Dash = true;
    saveProgress();
    showMessage("Dash unlocked");
  }

  if (state.pickups.weapon.active && overlaps(player, state.pickups.weapon)) {
    state.pickups.weapon.active = false;
    player.weaponStage = 1;
    saveProgress();
    showMessage("Weapon evolved to Stage II");
  }
}

function updateCheckpoints() {
  state.nearbyCheckpointId = null;
  for (const checkpoint of state.checkpoints) {
    if (overlaps(state.player, checkpoint)) {
      state.nearbyCheckpointId = checkpoint.id;
      return;
    }
  }
}

function updateGate() {
  state.gate.active = !state.abilityUnlocked[state.gate.requiredAbility];
}

function updateCamera(dt) {
  const targetX = clamp(state.player.x - canvas.width * 0.35, 0, state.worldWidth - canvas.width);
  state.camera.x += (targetX - state.camera.x) * Math.min(1, dt / state.camera.smooth);
}

function updateHud() {
  hud.health.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  const hpPercent = clamp(state.player.hp / state.player.maxHp, 0, 1) * 100;
  const displayPercent = clamp(state.player.displayHp / state.player.maxHp, 0, 1) * 100;
  hud.healthBar.style.width = `${hpPercent}%`;
  hud.healthBarGhost.style.width = `${displayPercent}%`;
  hud.world.textContent = state.world;
  hud.element.textContent = state.element;
  hud.weapon.textContent = state.player.weaponStage === 0 ? "Shard Blade I" : "Shard Blade II";
  hud.invulnerable.textContent = state.debugInvulnerable ? "On" : "Off";

  if (!state.started) {
    hud.objective.textContent = "Press Enter to begin";
  } else if (state.gameWon) {
    hud.objective.textContent = "Exit reached";
  } else if (hasBossAlive() && state.player.x > 3400) {
    hud.objective.textContent = "Defeat the Eclipse Lord";
  } else if (state.nearbyCheckpointId) {
    const checkpoint = getCheckpointById(state, state.nearbyCheckpointId);
    hud.objective.textContent = `Press R to rest at ${checkpoint.label}`;
  } else if (state.pickups.dash.active) {
    hud.objective.textContent = "Reach the Dash Core";
  } else if (state.gate.active) {
    hud.objective.textContent = "The path is sealed";
  } else if (state.barrier.active) {
    hud.objective.textContent = "Use Fire and attack the barrier";
  } else if (state.pickups.weapon.active) {
    hud.objective.textContent = "Claim the weapon upgrade";
  } else {
    hud.objective.textContent = "Reach the exit chamber";
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();
  const shakeX = state.combat.screenShake > 0 ? (Math.random() * 2 - 1) * state.combat.screenShakeStrength : 0;
  const shakeY = state.combat.screenShake > 0 ? (Math.random() * 2 - 1) * state.combat.screenShakeStrength * 0.45 : 0;
  ctx.translate(-state.camera.x + shakeX, shakeY);
  drawRoomMarkers();
  drawFarStructures();
  drawPlatforms();
  drawRoomDecor();
  drawCheckpoints();
  drawShadowPlatforms();
  drawBarrier();
  drawGate();
  drawHazards();
  drawPickups();
  drawSlashEffects();
  drawEnemies();
  drawExit();
  drawPlayer();
  drawParticles();
  drawForegroundFrames();
  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (state.world === "Light") {
    gradient.addColorStop(0, "#6a5a88");
    gradient.addColorStop(0.32, "#1a223d");
    gradient.addColorStop(1, "#02040a");
  } else {
    gradient.addColorStop(0, "#2f376d");
    gradient.addColorStop(0.32, "#0b1025");
    gradient.addColorStop(1, "#020208");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMoonAndMist();
  drawParallaxRuins();
  drawUpperCanopy();
  drawForegroundFog();
}

function drawRoomMarkers() {
  const labels = [
    { x: 120, title: "Eclipse Keep", subtitle: "Outer rampart" },
    { x: 860, title: "Ash Gate", subtitle: "Break the sealed approach" },
    { x: 1960, title: "Umbral Galleries", subtitle: "Layered climb through the keep" },
    { x: 3460, title: "Eclipse Throne", subtitle: "Final ascent into darkness" }
  ];

  ctx.font = "700 22px Segoe UI";
  ctx.textAlign = "left";
  for (const label of labels) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(label.title, label.x, 70);
    ctx.fillStyle = "rgba(180,195,228,0.8)";
    ctx.font = "500 14px Segoe UI";
    ctx.fillText(label.subtitle, label.x, 92);
    ctx.font = "700 22px Segoe UI";
  }
}

function drawPlatforms() {
  for (const platform of state.platforms) {
    drawStonePlatform(platform);
  }

  for (const wall of state.walls) {
    drawWallPillar(wall);
  }
}

function drawShadowPlatforms() {
  for (const platform of state.shadowPlatforms) {
    const skin = getRoomVisualTheme(platform.x + platform.w * 0.5);
    if (state.world === platform.world) {
      drawSpectralPlatform(platform, skin, true);
    } else {
      drawSpectralPlatform(platform, skin, false);
    }
  }
}

function drawHazards() {
  for (const hazard of state.hazards ?? []) {
    if (hazard.kind !== "spikes") {
      continue;
    }
    drawHazardBed(hazard);
  }
}

function drawBarrier() {
  if (!state.barrier.active) {
    return;
  }

  const x = state.barrier.x;
  const y = state.barrier.y;
  const w = state.barrier.w;
  const h = state.barrier.h;
  const heat = state.element === "Fire";
  const base = heat ? COLORS.burnableHot : COLORS.burnable;

  ctx.save();
  const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.35, 6, x + w * 0.5, y + h * 0.45, 54);
  glow.addColorStop(0, hexToRgba(heat ? "#ffb47d" : "#8c5a3b", heat ? 0.32 : 0.18));
  glow.addColorStop(1, hexToRgba(heat ? "#ff9a63" : "#5f3722", 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 28, y - 18, w + 56, h + 42);

  ctx.fillStyle = "rgba(17, 10, 9, 0.92)";
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h);
  ctx.lineTo(x + 8, y + 22);
  ctx.lineTo(x + 16, y + 3);
  ctx.lineTo(x + 23, y + 18);
  ctx.lineTo(x + 31, y + 2);
  ctx.lineTo(x + w - 4, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h);
  ctx.lineTo(x + 10, y + 26);
  ctx.lineTo(x + 17, y + 9);
  ctx.lineTo(x + 23, y + 20);
  ctx.lineTo(x + 30, y + 6);
  ctx.lineTo(x + w - 8, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(34, 14, 8, 0.82)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(heat ? "#ffd3a4" : "#d4976c", 0.34);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const px = x + 10 + i * 9;
    ctx.beginPath();
    ctx.moveTo(px, y + 16 + i * 3);
    ctx.lineTo(px + 3, y + h - 16 - i * 5);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i++) {
    const emberX = x + 8 + i * 7;
    const emberY = y + 14 + (i % 2) * 8;
    ctx.fillStyle = hexToRgba(heat ? "#ffd38f" : "#9f6844", heat ? 0.85 : 0.35);
    ctx.beginPath();
    ctx.arc(emberX, emberY, 1.8 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGate() {
  if (state.gate.active) {
    drawDiegeticGate(state.gate, true);
  } else {
    drawDiegeticGate(state.gate, false);
  }
}

function drawPickups() {
  if (state.pickups.dash.active) {
    drawPickupRelic(state.pickups.dash, "dash");
  }

  if (state.pickups.weapon.active) {
    drawPickupRelic(state.pickups.weapon, "weapon");
  }
}

function drawCheckpoints() {
  for (const checkpoint of state.checkpoints) {
    const active = checkpoint.id === state.savedCheckpointId;
    const nearby = checkpoint.id === state.nearbyCheckpointId;
    drawCheckpointShrine(checkpoint, active, nearby);
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      continue;
    }

    const enemyState = getEnemyState(enemy);
    const hurtStrength = clamp(enemy.hurtTimer / 0.22, 0, 1);
    const reactionStrength = clamp(enemy.reactionTimer / 0.24, 0, 1);
    const baseColor = enemy.invuln > 0 || hurtStrength > 0.2 ? COLORS.enemyHit : getEnemyColor(enemy.type);
    const facing = enemy.vx >= 0 ? 1 : -1;
    const anticipationStrength = enemyState === "windup"
      ? 1 - clamp(enemy.stateTimer / getEnemyStateDurationGuess(enemy), 0, 1)
      : 0;
    const actionStrength = enemyState === "burst"
      ? 1
      : enemyState === "recover" || enemyState === "stagger"
        ? clamp(enemy.stateTimer / 0.24, 0, 1)
        : 0;
    const renderEnemy = {
      ...enemy,
      x: enemy.x + Math.sin(performance.now() * 0.09 + enemy.x * 0.08) * hurtStrength * 3.5 - facing * anticipationStrength * getEnemyAnticipationLean(enemy),
      y: enemy.y - hurtStrength * 2 + anticipationStrength * getEnemyAnticipationLift(enemy) + getEnemyReactionOffset(enemy, reactionStrength),
      telegraphAlpha: anticipationStrength,
      actionAlpha: actionStrength,
      reactionAlpha: reactionStrength,
      renderState: enemyState
    };

    if (hurtStrength > 0) {
      ctx.save();
      ctx.globalAlpha = hurtStrength * 0.35;
      ctx.fillStyle = "#fff3d6";
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, enemy.w * 0.65, enemy.h * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (enemy.type === "shadowWalker") {
      const fade = enemyState === "windup"
        ? 0.48
        : 0.72 + Math.sin(performance.now() * 0.01 + enemy.x * 0.02) * 0.12;
      ctx.globalAlpha = clamp(fade, 0.35, 0.9);
    } else if (enemy.type === "watcher") {
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = "rgba(167, 231, 255, 0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, enemy.w * 0.72, enemy.h * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawEnemyTelegraph(renderEnemy);
    drawEnemySilhouette(renderEnemy, baseColor, facing);
    ctx.restore();
    const barWidth = enemy.boss ? 96 : 36;
    const barHeight = enemy.boss ? 6 : 4;
    const barX = enemy.x + enemy.w / 2 - barWidth / 2;
    const barY = enemy.boss ? enemy.y - 22 : enemy.y - 14;
    drawHealthBar(barX, barY, barWidth, barHeight, enemy.hp, enemy.displayHp, getMaxEnemyHp(enemy));
    if (enemy.boss) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 241, 220, 0.9)";
      ctx.font = "600 13px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText(enemy.name, enemy.x + enemy.w / 2, enemy.y - 30);
      ctx.restore();
    }
  }
}

function getEnemyStateDurationGuess(enemy) {
  switch (enemy.type) {
    case "demon":
      return 0.42;
    case "shadowWalker":
      return 0.28;
    case "watcher":
      return 0.22;
    case "oracle":
      return 0.28;
    case "revenant":
      return 0.24;
    default:
      return 0.16;
  }
}

function getEnemyAnticipationLean(enemy) {
  switch (enemy.type) {
    case "demon":
      return 10;
    case "shadowWalker":
      return 8;
    case "oracle":
    case "revenant":
      return 7;
    case "watcher":
      return 5;
    default:
      return 6;
  }
}

function getEnemyAnticipationLift(enemy) {
  if (enemy.type === "watcher" || enemy.type === "oracle") {
    return -2;
  }
  return 0;
}

function getEnemyReactionOffset(enemy, strength) {
  if (enemy.reactionType === "pogo") {
    return 4 - strength * 10;
  }
  if (enemy.reactionType === "finisher") {
    return -strength * 8;
  }
  return -strength * 3;
}

function drawEnemyTelegraph(enemy) {
  if (enemy.telegraphAlpha > 0) {
    const pulse = 0.35 + Math.sin(performance.now() * 0.02 + enemy.x * 0.02) * 0.18;
    const telegraphColor = getEnemyTelegraphColor(enemy.type);
    ctx.save();
    ctx.globalAlpha = clamp(enemy.telegraphAlpha * 0.65 + pulse, 0.15, 0.78);
    ctx.strokeStyle = telegraphColor;
    ctx.lineWidth = enemy.boss ? 4 : 3;
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.72, enemy.h * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.renderState === "burst") {
    const streakColor = getEnemyTelegraphColor(enemy.type);
    ctx.save();
    ctx.globalAlpha = 0.22 + enemy.actionAlpha * 0.2;
    ctx.strokeStyle = streakColor;
    ctx.lineWidth = enemy.boss ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.w * 0.2, enemy.y + enemy.h * 0.5);
    ctx.lineTo(enemy.x + enemy.w * 0.8, enemy.y + enemy.h * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.reactionAlpha > 0 && enemy.reactionType !== "none") {
    ctx.save();
    ctx.globalAlpha = Math.min(0.34, enemy.reactionAlpha * 0.4);
    ctx.fillStyle = enemy.reactionType === "pogo"
      ? "rgba(228, 246, 255, 0.9)"
      : enemy.reactionType === "finisher"
        ? "rgba(255, 223, 185, 0.88)"
        : "rgba(255, 244, 228, 0.76)";
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.78, enemy.h * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function getEnemyTelegraphColor(type) {
  switch (type) {
    case "goblin":
      return "rgba(255, 238, 170, 0.92)";
    case "shadowWalker":
      return "rgba(174, 174, 255, 0.95)";
    case "demon":
      return "rgba(255, 144, 116, 0.94)";
    case "watcher":
      return "rgba(176, 238, 255, 0.96)";
    case "oracle":
      return "rgba(204, 230, 255, 0.96)";
    case "revenant":
      return "rgba(223, 241, 255, 0.96)";
    default:
      return "rgba(255,255,255,0.9)";
  }
}

function drawExit() {
  drawExitShrine();
}

function drawFarStructures() {
  const structures = [
    { x: 90, y: 150, w: 140, h: 260, top: "spire" },
    { x: 780, y: 170, w: 130, h: 220, top: "chain" },
    { x: 1700, y: 110, w: 180, h: 300, top: "fortress" },
    { x: 2560, y: 130, w: 200, h: 290, top: "fortress" },
    { x: 3400, y: 100, w: 220, h: 320, top: "throne" }
  ];

  for (const structure of structures) {
    const color = state.world === "Light" ? "rgba(18, 22, 36, 0.32)" : "rgba(12, 14, 28, 0.4)";
    ctx.fillStyle = color;
    ctx.fillRect(structure.x, structure.y, structure.w, structure.h);
    ctx.fillStyle = state.world === "Light" ? "rgba(182, 216, 255, 0.08)" : "rgba(144, 164, 255, 0.11)";
    ctx.fillRect(structure.x + 10, structure.y + 10, 10, structure.h - 20);
    ctx.fillRect(structure.x + structure.w - 20, structure.y + 10, 10, structure.h - 20);

    if (structure.top === "arch") {
      ctx.beginPath();
      ctx.arc(structure.x + structure.w * 0.5, structure.y, structure.w * 0.5, Math.PI, 0);
      ctx.lineTo(structure.x + structure.w, structure.y + 30);
      ctx.lineTo(structure.x, structure.y + 30);
      ctx.closePath();
      ctx.fill();
    } else if (structure.top === "chain") {
      drawHangingChain(structure.x + structure.w * 0.5, structure.y - 70, 96, "rgba(160, 168, 195, 0.18)");
    } else if (structure.top === "spire") {
      ctx.beginPath();
      ctx.moveTo(structure.x + structure.w * 0.5, structure.y - 56);
      ctx.lineTo(structure.x + 16, structure.y + 6);
      ctx.lineTo(structure.x + structure.w - 16, structure.y + 6);
      ctx.closePath();
      ctx.fill();
    } else if (structure.top === "fortress") {
      ctx.fillRect(structure.x + 24, structure.y - 42, structure.w - 48, 46);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(structure.x + 20 + i * (structure.w / 3), structure.y - 16, 16, 18);
      }
    } else if (structure.top === "throne") {
      ctx.beginPath();
      ctx.moveTo(structure.x + 24, structure.y + 22);
      ctx.lineTo(structure.x + structure.w * 0.5, structure.y - 44);
      ctx.lineTo(structure.x + structure.w - 24, structure.y + 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(structure.x + structure.w * 0.5 - 18, structure.y - 76, 36, 42);
    }
  }
}

function drawRoomDecor() {
  drawRoomAStartShrine();
  drawRoomBDashGateSet();
  drawRoomCEnemyHall();
  drawRoomDExitSanctum();
  drawBossShrineArena();
  drawEclipseBraziers();
  drawChainCurtains();
}

function drawRoomAStartShrine() {
  drawRootCluster(110, 615, 90, state.world === "Light" ? "rgba(126, 108, 166, 0.24)" : "rgba(88, 92, 162, 0.24)");
  drawLantern(310, 482, "#f0d6a1", 0.16);
  ctx.fillStyle = "rgba(24, 24, 40, 0.62)";
  ctx.beginPath();
  ctx.moveTo(74, 620);
  ctx.lineTo(98, 520);
  ctx.lineTo(142, 520);
  ctx.lineTo(170, 620);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(230, 238, 255, 0.08)";
  ctx.fillRect(108, 542, 24, 34);
}

function drawRoomBDashGateSet() {
  drawArchway(820, 470, 190, 160, "rgba(56, 44, 64, 0.64)");
  drawHangingChain(924, 304, 170, "rgba(215, 196, 157, 0.18)");
  drawLantern(924, 454, "#efcf9c", 0.16);
}

function drawRoomCEnemyHall() {
  for (const x of [1500, 1820, 2140, 2460, 2780]) {
    drawBrokenColumn(x, 446, 30, 174);
  }
  drawRootCluster(2140, 620, 320, state.world === "Light" ? "rgba(132, 112, 164, 0.2)" : "rgba(86, 94, 166, 0.22)");
}

function drawRoomDExitSanctum() {
  drawArchway(2480, 364, 340, 256, "rgba(40, 34, 60, 0.8)");
  drawLantern(2520, 348, "#efcf9c", 0.15);
  drawLantern(2760, 348, "#efcf9c", 0.15);
  drawRootCluster(2640, 620, 240, state.world === "Light" ? "rgba(136, 114, 166, 0.22)" : "rgba(86, 96, 170, 0.22)");
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(2880, 408, 136, 8);
}

function drawBossShrineArena() {
  drawArchway(3440, 320, 440, 300, "rgba(28, 28, 52, 0.88)");
  drawBrokenColumn(3480, 392, 36, 228);
  drawBrokenColumn(3770, 386, 36, 234);
  drawLantern(3570, 350, "#f0d6a1", 0.14);
  drawLantern(3720, 350, "#f0d6a1", 0.14);
  ctx.save();
  ctx.strokeStyle = state.world === "Light" ? "rgba(242, 212, 157, 0.24)" : "rgba(166, 160, 255, 0.26)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(3640, 604, 132, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3640, 604, 62, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEclipseBraziers() {
  for (const brazier of [
    { x: 680, y: 586 }, { x: 1320, y: 586 }, { x: 2360, y: 586 }, { x: 3560, y: 586 }
  ]) {
    ctx.fillStyle = "rgba(28, 28, 42, 0.92)";
    ctx.fillRect(brazier.x, brazier.y, 18, 28);
    ctx.fillStyle = "#f0c885";
    ctx.beginPath();
    ctx.moveTo(brazier.x + 9, brazier.y - 18);
    ctx.quadraticCurveTo(brazier.x - 2, brazier.y - 4, brazier.x + 5, brazier.y + 4);
    ctx.quadraticCurveTo(brazier.x + 11, brazier.y - 8, brazier.x + 9, brazier.y - 18);
    ctx.fill();
  }
}

function drawChainCurtains() {
  for (const cluster of [
    { x: 560, y: 60, w: 120 },
    { x: 1600, y: 40, w: 160 },
    { x: 2600, y: 50, w: 180 },
    { x: 3520, y: 40, w: 160 }
  ]) {
    for (let i = 0; i < 6; i++) {
      const px = cluster.x + i * (cluster.w / 6);
      const len = 40 + (i % 3) * 18;
      drawHangingChain(px + 8, cluster.y, len, state.world === "Light" ? "rgba(215, 199, 168, 0.16)" : "rgba(128, 132, 214, 0.18)");
    }
  }
}

function drawArchway(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 34, w, h - 34);
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + 34, w * 0.5, Math.PI, 0);
  ctx.lineTo(x + w, y + 34);
  ctx.lineTo(x, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = state.world === "Light" ? "rgba(12, 15, 24, 0.72)" : "rgba(8, 9, 18, 0.82)";
  ctx.fillRect(x + 34, y + 56, w - 68, h - 56);
}

function drawBrokenColumn(x, y, w, h) {
  ctx.fillStyle = "rgba(34, 38, 48, 0.46)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(97, 108, 124, 0.18)";
  ctx.fillRect(x + 5, y + 10, 5, h - 18);
  ctx.fillRect(x + w - 10, y + 10, 5, h - 18);
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 18);
  ctx.lineTo(x + w * 0.5, y - 12);
  ctx.lineTo(x + w + 6, y + 16);
  ctx.closePath();
  ctx.fill();
}

function drawRootCluster(x, y, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    const startX = x + i * (width / 5);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo(startX - 10 + i * 2, y - 28 - (i % 2) * 10, startX + 10 - i * 2, y - 54 - i * 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHangingChain(x, y, length, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < length; i += 12) {
    ctx.beginPath();
    ctx.ellipse(x + (i % 24 === 0 ? -2 : 2), y + i, 4, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLantern(x, y, color, glowAlpha) {
  ctx.save();
  ctx.strokeStyle = "rgba(188, 194, 214, 0.26)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 48);
  ctx.lineTo(x, y - 10);
  ctx.stroke();
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 42);
  glow.addColorStop(0, `${hexToRgba(color, glowAlpha * 2.5)}`);
  glow.addColorStop(1, `${hexToRgba(color, 0)}`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 10, 16, 20, 4);
  ctx.fill();
  ctx.restore();
}

function drawExitShrine() {
  const x = state.exitZone.x;
  const y = state.exitZone.y;
  const w = state.exitZone.w;
  const h = state.exitZone.h;
  const glowColor = state.world === "Light" ? "#d8f0db" : "#8ea1ff";

  ctx.save();
  const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.4, 10, x + w * 0.5, y + h * 0.4, 110);
  glow.addColorStop(0, hexToRgba(glowColor, state.gameWon ? 0.34 : 0.2));
  glow.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 70, y - 90, w + 140, h + 170);

  drawArchway(x - 24, y - 56, w + 48, h + 92, "rgba(18, 22, 36, 0.88)");
  ctx.fillStyle = "rgba(10, 13, 20, 0.88)";
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  ctx.strokeStyle = state.gameWon ? "#ffffff" : "#9ff7d8";
  ctx.lineWidth = 4;
  roundRectPath(x, y, w, h, 12);
  ctx.stroke();

  ctx.strokeStyle = "rgba(230, 236, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y - 40);
  ctx.lineTo(x + w * 0.5, y + h + 22);
  ctx.moveTo(x - 16, y + h * 0.5);
  ctx.lineTo(x + w + 16, y + h * 0.5);
  ctx.stroke();

  ctx.fillStyle = hexToRgba(glowColor, 0.3);
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.5, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUpperCanopy() {
  ctx.save();
  const color = state.world === "Light" ? "rgba(32, 37, 49, 0.18)" : "rgba(21, 19, 38, 0.24)";
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 170) - state.camera.x * 0.33) % (canvas.width + 220) - 80;
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.quadraticCurveTo(x + 40, 46 + (i % 3) * 10, x + 16, 120);
    ctx.quadraticCurveTo(x + 86, 70, x + 104, -20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  const tint = getPlayerTint();
  const hurtStrength = clamp(player.hurtFlash / 0.28, 0, 1);
  const attackLunge = player.attackRecover > 0 ? player.facing * 5 * (player.attackRecover / 0.1) : 0;
  const movementPolish = getPlayerRenderPolish(player);
  const renderPlayer = {
    ...player,
    x: player.x + attackLunge + Math.sin(performance.now() * 0.12) * hurtStrength * 2 + movementPolish.offsetX,
    y: player.y + movementPolish.offsetY,
    renderScaleX: movementPolish.scaleX,
    renderScaleY: movementPolish.scaleY,
    capeLag: movementPolish.capeLag,
    dashSmear: movementPolish.dashSmear
  };
  drawShadowWarrior(renderPlayer, player.invuln > 0 || hurtStrength > 0.2 ? "#ffffff" : tint);
  drawHealthBar(player.x - 3, player.y - 14, player.w + 6, 5, player.hp, player.displayHp, player.maxHp);

  if (player.attackTimer > 0) {
    drawAttackArc(player);
  }
}

function drawAttackArc(player) {
  const profile = getAttackProfileById(player, player.attackProfileId);
  const attackX = player.x + profile.offsetX;
  const progress = 1 - clamp(player.attackTimer / 0.1, 0, 1);
  const arcColor = profile.slashColor;

  ctx.save();
  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.22;
  ctx.strokeRect(attackX, player.y + profile.offsetY, profile.width, profile.height);

  ctx.globalAlpha = 0.9 - progress * 0.35;
  ctx.lineCap = "round";
  ctx.beginPath();
  const originX = player.x + player.w * 0.5;
  const originY = player.y + 28;
  if (profile.type === "downslash") {
    ctx.moveTo(originX - 4, player.y + player.h * 0.48);
    ctx.quadraticCurveTo(originX - 16, player.y + player.h + 10, originX - 4, player.y + player.h + 38);
    ctx.moveTo(originX + 4, player.y + player.h * 0.48);
    ctx.quadraticCurveTo(originX + 16, player.y + player.h + 10, originX + 4, player.y + player.h + 38);
  } else if (player.facing > 0) {
    ctx.arc(originX + 14, originY, 34 + profile.width * 0.18, -0.95 + progress * 0.3, 0.72 + progress * 0.2);
  } else {
    ctx.arc(originX - 14, originY, 34 + profile.width * 0.18, Math.PI - 0.72 - progress * 0.2, Math.PI + 0.95 - progress * 0.3, true);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSlashEffects() {
  for (const effect of state.slashEffects) {
    const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    const width = effect.width * (1.05 - alpha * 0.12);
    const height = effect.height * (0.82 + alpha * 0.2);
    ctx.save();
    ctx.translate(effect.x, effect.y);
    if (effect.type !== "downslash") {
      ctx.scale(effect.facing, 1);
    }
    ctx.globalAlpha = alpha * 0.55;
    const gradient = effect.type === "downslash"
      ? ctx.createLinearGradient(0, -height * 0.65, 0, height * 0.9)
      : ctx.createLinearGradient(0, -height * 0.4, width * 0.85, height * 0.2);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.45, effect.color);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8 * alpha;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (effect.type === "downslash") {
      ctx.moveTo(0, -height * 0.42);
      ctx.quadraticCurveTo(-width * 0.22, height * 0.02, 0, height * 0.8);
      ctx.moveTo(0, -height * 0.42);
      ctx.quadraticCurveTo(width * 0.22, height * 0.02, 0, height * 0.8);
    } else {
      ctx.moveTo(-8, -height * 0.35);
      ctx.quadraticCurveTo(width * 0.38, -height * 0.65, width * 0.92, height * 0.16);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShadowWarrior(player, tint) {
  const x = player.x;
  const y = player.y;
  const w = player.w;
  const h = player.h;
  const facing = player.facing;
  const renderScaleX = player.renderScaleX ?? 1;
  const renderScaleY = player.renderScaleY ?? 1;
  const capeLag = player.capeLag ?? 0;
  const dashSmear = player.dashSmear ?? 0;

  ctx.save();
  ctx.translate(x + w / 2, y);
  ctx.scale(facing, 1);
  ctx.translate(0, h * 0.5);
  ctx.scale(renderScaleX, renderScaleY);
  ctx.translate(-(x + w / 2), -(y + h * 0.5));

  drawOvalShadow(x + 19, y + h + 4, 26, 8, "rgba(0,0,0,0.24)");

  if (dashSmear > 0.05) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.32, dashSmear * 0.35);
    const smear = ctx.createLinearGradient(x - 18, y + 28, x + 34, y + 40);
    smear.addColorStop(0, "rgba(255,255,255,0)");
    smear.addColorStop(0.45, hexToRgba(tint.startsWith("rgb") ? "#dfe7ff" : tint, 0.28));
    smear.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = smear;
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 38);
    ctx.quadraticCurveTo(x + 8, y + 16, x + 38, y + 32);
    ctx.quadraticCurveTo(x + 16, y + 54, x - 8, y + 56);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 4);
  ctx.quadraticCurveTo(x + 34, y - 10, x + 37, y - 28);
  ctx.quadraticCurveTo(x + 46, y - 6, x + 34, y + 10);
  ctx.quadraticCurveTo(x + 53, y - 6, x + 58, y - 20);
  ctx.quadraticCurveTo(x + 56, y + 4, x + 40, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.cape;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 18);
  ctx.lineTo(x + 1 - capeLag * 0.45, y + 50);
  ctx.lineTo(x + 8 - capeLag * 0.2, y + h);
  ctx.lineTo(x + 21, y + 54);
  ctx.lineTo(x + 34 + capeLag * 0.12, y + h - Math.abs(capeLag) * 0.15);
  ctx.lineTo(x + 39 + capeLag * 0.22, y + 45);
  ctx.lineTo(x + 26, y + 18);
  ctx.closePath();
  ctx.fill();

  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18);
    ctx.lineTo(x + 1 - capeLag * 0.45, y + 50);
    ctx.lineTo(x + 8 - capeLag * 0.2, y + h);
    ctx.lineTo(x + 21, y + 54);
    ctx.lineTo(x + 34 + capeLag * 0.12, y + h - Math.abs(capeLag) * 0.15);
    ctx.lineTo(x + 39 + capeLag * 0.22, y + 45);
    ctx.lineTo(x + 26, y + 18);
    ctx.closePath();
  });

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 16, 22, 28, 8);
  ctx.fill();
  strokeBlobOutline(() => ctx.beginPath() || ctx.roundRect(x + 10, y + 16, 22, 28, 8));

  ctx.fillStyle = "#0d0e16";
  ctx.beginPath();
  ctx.arc(x + 21, y + 13, 11, 0, Math.PI * 2);
  ctx.fill();
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 21, y + 13, 11, 0, Math.PI * 2);
  });

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 18);
  ctx.lineTo(x + 21, y + 3);
  ctx.lineTo(x + 32, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8fbff";
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 13, 4.8, 6.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 24.5, y + 13, 4.1, 6, 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.steel;
  ctx.fillRect(x + 30, y + 26, 14, 4);
  ctx.fillRect(x + 28, y + 44, 5, 18);
  ctx.fillRect(x + 15, y + 44, 5, 18);
  ctx.fillRect(x + 9, y + 25, 5, 18);
  ctx.fillRect(x + 28, y + 25, 5, 18);

  if (state.element !== "None") {
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 21, y + 28, 20, -0.7, 1.3);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 30);
  ctx.quadraticCurveTo(x + 0, y + 36, x - 6, y + 48);
  ctx.moveTo(x + 32, y + 30);
  ctx.quadraticCurveTo(x + 44, y + 36, x + 50, y + 46);
  ctx.stroke();

  ctx.restore();
}

function drawEnemySilhouette(enemy, baseColor, facing) {
  if (enemy.type === "goblin") {
    drawGoblin(enemy, baseColor, facing);
    return;
  }
  if (enemy.type === "shadowWalker") {
    drawShadowWalker(enemy, baseColor, facing);
    return;
  }
  if (enemy.type === "watcher") {
    drawWatcher(enemy, baseColor, facing);
    return;
  }
  if (enemy.type === "oracle") {
    drawOracle(enemy, baseColor, facing);
    return;
  }
  if (enemy.type === "revenant") {
    drawRevenant(enemy, baseColor, facing);
    return;
  }
  drawDemon(enemy, baseColor, facing);
}

function drawGoblin(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const crouch = enemy.telegraphAlpha * 5 - enemy.actionAlpha * 2;
  drawOvalShadow(x + 20, y + enemy.h + 3, 22, 7, "rgba(0,0,0,0.22)");
  ctx.save();
  ctx.translate(x + enemy.w / 2, y + crouch);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -(y + crouch));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 16, 26, 28, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 21, y + 12, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + 0, y + 0);
  ctx.lineTo(x + 14, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 32, y + 10);
  ctx.lineTo(x + 42, y + 0);
  ctx.lineTo(x + 28, y + 6);
  ctx.closePath();
  ctx.fill();
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 21, y + 12, 12, 0, Math.PI * 2);
  });
  ctx.fillStyle = "#121417";
  ctx.fillRect(x + 14, y + 46, 5, 16);
  ctx.fillRect(x + 24, y + 46, 5, 16);
  ctx.fillRect(x + 34, y + 22, 8, 5);
  ctx.fillStyle = "#fff4b8";
  ctx.fillRect(x + 17, y + 11, 3, 2);
  ctx.fillRect(x + 24, y + 11, 3, 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 20);
  ctx.lineTo(x + 2, y + 30);
  ctx.stroke();
  ctx.restore();
}

function drawShadowWalker(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const phaseLift = enemy.renderState === "burst" ? -8 : enemy.telegraphAlpha * 3;
  drawOvalShadow(x + 22, y + enemy.h + 3, 24, 7, "rgba(0,0,0,0.22)");
  ctx.save();
  ctx.translate(x + enemy.w / 2, y + phaseLift);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -(y + phaseLift));
  ctx.fillStyle = "rgba(14,16,28,0.85)";
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 10);
  ctx.lineTo(x + 3, y + 48);
  ctx.lineTo(x + 10, y + 58);
  ctx.lineTo(x + 35, y + 58);
  ctx.lineTo(x + 43, y + 48);
  ctx.lineTo(x + 34, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 23, y + 15, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 16, y + 25, 14, 24);
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 23, y + 15, 11, 0, Math.PI * 2);
  });
  ctx.fillStyle = "#dbe0ff";
  ctx.fillRect(x + 17, y + 13, 4, 2);
  ctx.fillRect(x + 24, y + 13, 4, 2);
  ctx.strokeStyle = "rgba(141,149,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 46);
  ctx.lineTo(x + 39, y + 52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 28);
  ctx.quadraticCurveTo(x - 4, y + 36, x + 8, y + 54);
  ctx.stroke();
  ctx.restore();
}

function drawDemon(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const lean = enemy.telegraphAlpha * 10 + enemy.actionAlpha * 4;
  drawOvalShadow(x + 24, y + enemy.h + 3, 26, 8, "rgba(0,0,0,0.24)");
  ctx.save();
  ctx.translate(x + enemy.w / 2, y);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -y);
  ctx.translate(lean * 0.18, 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 18, 32, 30, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 24, y + 13, 13, 0, Math.PI * 2);
  ctx.fill();
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 24, y + 13, 13, 0, Math.PI * 2);
  });
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 5);
  ctx.lineTo(x + 10, y - 6);
  ctx.lineTo(x + 19, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 33, y + 5);
  ctx.lineTo(x + 37, y - 6);
  ctx.lineTo(x + 28, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a0f11";
  ctx.fillRect(x + 14, y + 48, 6, 16);
  ctx.fillRect(x + 28, y + 48, 6, 16);
  ctx.fillStyle = "#ffe0cf";
  ctx.fillRect(x + 18, y + 11, 3, 2);
  ctx.fillRect(x + 27, y + 11, 3, 2);
  ctx.fillStyle = "#ffd479";
  ctx.fillRect(x + 40, y + 26, 10, 5);
  ctx.strokeStyle = "rgba(255,132,104,0.32)";
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 24);
  ctx.quadraticCurveTo(x - 8, y + 32, x + 8, y + 54);
  ctx.stroke();
  ctx.restore();
}

function getEnemyColor(type) {
  if (type === "goblin") {
    return COLORS.goblin;
  }
  if (type === "shadowWalker") {
    return COLORS.shadowWalker;
  }
  if (type === "watcher") {
    return COLORS.watcher;
  }
  if (type === "oracle") {
    return "#bca6ff";
  }
  if (type === "revenant") {
    return "#d5ecff";
  }
  return COLORS.demon;
}

function drawOracle(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const bob = Math.sin(performance.now() * 0.0035 + x * 0.01) * 7;
  const auraPulse = enemy.telegraphAlpha > 0 ? 0.2 + enemy.telegraphAlpha * 0.35 : 0;
  drawOvalShadow(x + enemy.w * 0.5, y + enemy.h + 8, 32, 9, "rgba(0,0,0,0.18)");
  ctx.save();
  ctx.translate(x + enemy.w / 2, y + bob);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -(y + bob));

  ctx.fillStyle = "rgba(13, 19, 36, 0.94)";
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 18);
  ctx.lineTo(x + 8, y + 74);
  ctx.lineTo(x + 22, y + 96);
  ctx.lineTo(x + 62, y + 96);
  ctx.lineTo(x + 76, y + 74);
  ctx.lineTo(x + 66, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 42, y + 24, 18, 0, Math.PI * 2);
  ctx.fill();
  if (auraPulse > 0) {
    ctx.save();
    ctx.globalAlpha = auraPulse;
    ctx.strokeStyle = "rgba(200, 228, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 42, y + 24, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#eefcff";
  ctx.beginPath();
  ctx.ellipse(x + 42, y + 24, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0d1320";
  ctx.beginPath();
  ctx.arc(x + 42, y + 24, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(167, 220, 255, 0.42)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const px = x + 16 + i * 12;
    ctx.beginPath();
    ctx.moveTo(px, y + 54);
    ctx.quadraticCurveTo(px - 5, y + 78, px + (i % 2 === 0 ? -2 : 3), y + 98);
    ctx.stroke();
  }

  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 42, y + 24, 18, 0, Math.PI * 2);
  });
  ctx.restore();
}

function drawRevenant(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const readiness = enemy.telegraphAlpha * 0.16;
  drawOvalShadow(x + enemy.w * 0.5, y + enemy.h + 5, 36, 10, "rgba(0,0,0,0.26)");
  ctx.save();
  ctx.translate(x + enemy.w / 2, y);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -y);
  ctx.scale(1 + readiness, 1 - readiness * 0.6);

  ctx.fillStyle = "rgba(20, 28, 44, 0.94)";
  ctx.beginPath();
  ctx.roundRect(x + 16, y + 24, 38, 46, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 18, y + 18, 34, 38, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 35, y + 18, 15, 0, Math.PI * 2);
  ctx.fill();
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 18, 34, 38, 10);
  });
  ctx.fillStyle = "#11161d";
  ctx.fillRect(x + 24, y + 64, 8, 24);
  ctx.fillRect(x + 40, y + 64, 8, 24);
  ctx.fillRect(x + 6, y + 30, 16, 8);
  ctx.fillStyle = "#eff7ff";
  ctx.fillRect(x + 29, y + 15, 4, 3);
  ctx.fillRect(x + 37, y + 15, 4, 3);
  ctx.fillStyle = "#bfdfff";
  ctx.fillRect(x + 50, y + 30, 18, 8);
  ctx.fillRect(x + 62, y + 12, 6, 40);
  ctx.strokeStyle = "rgba(186, 223, 255, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 35, y + 38, 30, -0.5, 1.2);
  ctx.stroke();
  ctx.fillStyle = "rgba(188, 223, 255, 0.24)";
  ctx.beginPath();
  ctx.ellipse(x + 35, y + 80, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWatcher(enemy, color, facing) {
  const x = enemy.x;
  const y = enemy.y;
  const bob = Math.sin(performance.now() * 0.004 + x * 0.01) * 6;
  const eyeGlow = enemy.telegraphAlpha * 0.6 + (enemy.renderState === "burst" ? 0.32 : 0);
  drawOvalShadow(x + 20, y + enemy.h + 8, 18, 6, "rgba(0,0,0,0.16)");

  ctx.save();
  ctx.translate(x + enemy.w / 2, y + bob);
  ctx.scale(facing, 1);
  ctx.translate(-(x + enemy.w / 2), -(y + bob));

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 20, y + 18, 14, 0, Math.PI * 2);
  ctx.fill();
  strokeBlobOutline(() => {
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 14, 0, Math.PI * 2);
  });

  ctx.fillStyle = "#effcff";
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 18, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (eyeGlow > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(eyeGlow, 0, 0.85);
    ctx.fillStyle = "#d7f7ff";
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#11161f";
  ctx.beginPath();
  ctx.arc(x + 20, y + 18, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const px = x + 8 + i * 8;
    ctx.beginPath();
    ctx.moveTo(px, y + 30);
    ctx.quadraticCurveTo(px - 4, y + 42, px + (i % 2 === 0 ? -2 : 2), y + 48);
    ctx.stroke();
  }

  ctx.restore();
}

function getMaxEnemyHp(enemy) {
  if (enemy.maxHp) {
    return enemy.maxHp;
  }
  if (enemy.type === "goblin") {
    return 2;
  }
  if (enemy.type === "shadowWalker") {
    return 3;
  }
  if (enemy.type === "watcher") {
    return enemy.name === "Sanctum Watcher" ? 3 : 2;
  }
  if (enemy.type === "oracle") {
    return 16;
  }
  if (enemy.type === "revenant") {
    return 14;
  }
  return 4;
}

function strokeBlobOutline(drawPath) {
  ctx.save();
  ctx.strokeStyle = "rgba(10, 11, 17, 0.75)";
  ctx.lineWidth = 2.5;
  drawPath();
  ctx.stroke();
  ctx.restore();
}

function drawOvalShadow(x, y, rx, ry, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMoonAndMist() {
  ctx.save();
  const moonX = 1010 - state.camera.x * 0.08;
  const moonY = 118;
  ctx.fillStyle = state.world === "Light" ? "rgba(235, 205, 152, 0.8)" : "rgba(160, 150, 255, 0.54)";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = state.world === "Light" ? "rgba(8, 9, 16, 0.98)" : "rgba(4, 5, 12, 0.96)";
  ctx.beginPath();
  ctx.arc(moonX + 22, moonY - 6, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = state.world === "Light" ? "rgba(239, 209, 160, 0.18)" : "rgba(166, 160, 255, 0.16)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 74, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const y = 360 + i * 38;
    const x = ((i * 190) - state.camera.x * (0.11 + i * 0.015)) % (canvas.width + 260) - 120;
    ctx.fillStyle = state.world === "Light" ? "rgba(214, 222, 255, 0.035)" : "rgba(148, 158, 255, 0.045)";
    ctx.beginPath();
    ctx.ellipse(x, y, 240, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParallaxRuins() {
  const layers = [
    { speed: 0.1, color: "rgba(8, 10, 16, 0.34)", height: 0.58 },
    { speed: 0.18, color: "rgba(10, 13, 21, 0.48)", height: 0.67 },
    { speed: 0.28, color: "rgba(14, 17, 28, 0.72)", height: 0.76 }
  ];

  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= 9; i++) {
      const x = i * 170 - (state.camera.x * layer.speed % 170);
      const top = canvas.height * layer.height - (i % 3) * 40;
      ctx.lineTo(x, top + 60);
      ctx.lineTo(x + 45, top - 46);
      ctx.lineTo(x + 92, top + 70);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawForegroundFog() {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 220) - state.camera.x * 0.45) % (canvas.width + 300) - 120;
    const y = 602 + (i % 2) * 20;
    ctx.fillStyle = "rgba(241, 244, 255, 0.028)";
    ctx.beginPath();
    ctx.ellipse(x, y, 220, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Area skin lookup keeps collision shapes intact while giving each room a visual identity.
function getRoomVisualTheme(x) {
  if (x < 960) {
    return {
      id: "outerRampart",
      top: "#7a7f8a",
      face: "#4e5561",
      depth: "#272c33",
      trim: "#9da5b1",
      accent: "rgba(206, 214, 228, 0.18)",
      growth: "rgba(173, 188, 142, 0.18)"
    };
  }
  if (x < 1900) {
    return {
      id: "ashGate",
      top: "#8c786a",
      face: "#5b473f",
      depth: "#2b2220",
      trim: "#b79d86",
      accent: "rgba(255, 206, 160, 0.14)",
      growth: "rgba(172, 101, 72, 0.16)"
    };
  }
  if (x < 3300) {
    return {
      id: "umbralGalleries",
      top: "#707493",
      face: "#42465e",
      depth: "#1e2233",
      trim: "#98a0d4",
      accent: "rgba(188, 197, 255, 0.16)",
      growth: "rgba(94, 106, 162, 0.18)"
    };
  }
  return {
    id: "eclipseThrone",
    top: "#8e829d",
    face: "#4b4458",
    depth: "#1c1924",
    trim: "#d2c1dc",
    accent: "rgba(236, 221, 255, 0.14)",
    growth: "rgba(161, 145, 184, 0.16)"
  };
}

function drawSpectralPlatform(platform, skin, active) {
  const x = platform.x;
  const y = platform.y;
  const w = platform.w;
  const h = platform.h;

  ctx.save();
  const glow = ctx.createLinearGradient(x, y, x, y + h + 8);
  glow.addColorStop(0, active ? "#a8b5ff" : hexToRgba("#8a96d9", 0.32));
  glow.addColorStop(1, active ? "#4f5ab5" : hexToRgba("#4f5ab5", 0.1));
  ctx.fillStyle = glow;
  drawIrregularPlatformShape(x, y, w, h, 4, 5);
  ctx.fill();

  ctx.globalAlpha = active ? 0.7 : 0.28;
  ctx.strokeStyle = hexToRgba(skin.trim, 0.44);
  ctx.lineWidth = 2;
  drawIrregularPlatformShape(x + 2, y + 1, w - 4, Math.max(6, h - 2), 3, 4);
  ctx.stroke();

  ctx.fillStyle = hexToRgba("#dfe7ff", active ? 0.22 : 0.1);
  for (let i = 0; i < w; i += 22) {
    ctx.beginPath();
    ctx.arc(x + 8 + i, y + 4 + (i % 3), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHazardBed(hazard) {
  const theme = getRoomVisualTheme(hazard.x + hazard.w * 0.5);
  const count = Math.max(2, Math.floor(hazard.w / 12));

  ctx.save();
  ctx.fillStyle = hexToRgba(theme.depth, 0.92);
  ctx.fillRect(hazard.x - 4, hazard.y + hazard.h - 4, hazard.w + 8, 8);

  for (let i = 0; i < count; i++) {
    const px = hazard.x + i * (hazard.w / count);
    const spikeWidth = hazard.w / count;
    ctx.fillStyle = state.world === "Light" ? "rgba(224, 242, 255, 0.9)" : "rgba(161, 180, 255, 0.82)";
    ctx.beginPath();
    ctx.moveTo(px, hazard.y + hazard.h);
    ctx.lineTo(px + spikeWidth * 0.18, hazard.y + hazard.h * 0.68);
    ctx.lineTo(px + spikeWidth * 0.5, hazard.y);
    ctx.lineTo(px + spikeWidth * 0.82, hazard.y + hazard.h * 0.68);
    ctx.lineTo(px + spikeWidth, hazard.y + hazard.h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(35, 52, 69, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiegeticGate(gate, active) {
  const theme = getRoomVisualTheme(gate.x + gate.w * 0.5);
  const x = gate.x;
  const y = gate.y;
  const w = gate.w;
  const h = gate.h;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(x - 18, y - 18, w + 36, h + 24);
  ctx.fillStyle = theme.depth;
  ctx.fillRect(x - 10, y - 10, w + 20, h + 12);

  const frameGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  frameGradient.addColorStop(0, active ? COLORS.gate : hexToRgba(COLORS.gateOpen, 0.4));
  frameGradient.addColorStop(1, active ? theme.face : hexToRgba(COLORS.gateOpen, 0.18));
  ctx.fillStyle = frameGradient;
  roundRectPath(x, y, w, h, 8);
  ctx.fill();

  if (active) {
    ctx.fillStyle = hexToRgba(theme.trim, 0.15);
    ctx.fillRect(x + 5, y + 10, w - 10, h - 20);
    ctx.strokeStyle = "rgba(235, 222, 184, 0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 6, w - 8, h - 12);
    ctx.fillStyle = COLORS.pickupDash;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + 12);
    ctx.lineTo(x + w * 0.75, y + 30);
    ctx.lineTo(x + w * 0.52, y + 30);
    ctx.lineTo(x + w * 0.62, y + 52);
    ctx.strokeStyle = hexToRgba("#fff8dc", 0.66);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.gateOpen;
    ctx.lineWidth = 3;
    roundRectPath(x, y, w, h, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPickupRelic(pickup, kind) {
  const centerX = pickup.x + pickup.w * 0.5;
  const centerY = pickup.y + pickup.h * 0.5 + Math.sin(performance.now() * 0.004 + pickup.x * 0.03) * 3;
  const color = kind === "dash" ? COLORS.pickupDash : COLORS.pickupWeapon;
  const halo = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, 36);
  halo.addColorStop(0, hexToRgba(color, 0.42));
  halo.addColorStop(1, hexToRgba(color, 0));

  ctx.save();
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(22, 24, 34, 0.82)";
  ctx.lineWidth = 2;

  if (kind === "dash") {
    ctx.fillStyle = hexToRgba(color, 0.95);
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY - 8);
    ctx.lineTo(centerX + 1, centerY - 11);
    ctx.lineTo(centerX - 1, centerY - 1);
    ctx.lineTo(centerX + 8, centerY - 1);
    ctx.lineTo(centerX - 4, centerY + 12);
    ctx.lineTo(centerX - 2, centerY + 3);
    ctx.lineTo(centerX - 11, centerY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = hexToRgba(color, 0.95);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 14);
    ctx.lineTo(centerX + 10, centerY - 2);
    ctx.lineTo(centerX, centerY + 16);
    ctx.lineTo(centerX - 10, centerY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4fbff";
    ctx.fillRect(centerX - 1.5, centerY - 18, 3, 34);
  }
  ctx.restore();
}

function drawCheckpointShrine(checkpoint, active, nearby) {
  const glowColor = active
    ? (state.world === "Light" ? "#f3dca3" : "#9ca8ff")
    : nearby ? "#e9d6aa" : "#c6d0e4";

  ctx.save();
  const glow = ctx.createRadialGradient(checkpoint.x + 14, checkpoint.y + 18, 2, checkpoint.x + 14, checkpoint.y + 18, active ? 46 : nearby ? 38 : 28);
  glow.addColorStop(0, active ? hexToRgba(glowColor, 0.35) : nearby ? "rgba(255,232,190,0.18)" : "rgba(220,230,255,0.1)");
  glow.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(checkpoint.x + 14, checkpoint.y + 18, active ? 46 : nearby ? 38 : 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(18, 20, 30, 0.82)";
  ctx.beginPath();
  ctx.moveTo(checkpoint.x - 6, checkpoint.y + checkpoint.h);
  ctx.lineTo(checkpoint.x + 2, checkpoint.y + 14);
  ctx.lineTo(checkpoint.x + 14, checkpoint.y - 6);
  ctx.lineTo(checkpoint.x + 26, checkpoint.y + 14);
  ctx.lineTo(checkpoint.x + 34, checkpoint.y + checkpoint.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = active ? glowColor : nearby ? "#e9d6aa" : "rgba(180, 190, 215, 0.5)";
  ctx.lineWidth = active ? 3 : nearby ? 2.5 : 2;
  ctx.beginPath();
  ctx.moveTo(checkpoint.x + 14, checkpoint.y - 4);
  ctx.lineTo(checkpoint.x + 14, checkpoint.y + checkpoint.h - 8);
  ctx.stroke();

  ctx.fillStyle = active ? glowColor : nearby ? "#f1dfb8" : "rgba(165, 176, 204, 0.54)";
  ctx.beginPath();
  ctx.moveTo(checkpoint.x + 14, checkpoint.y - 2);
  ctx.lineTo(checkpoint.x + 26, checkpoint.y + 12);
  ctx.lineTo(checkpoint.x + 14, checkpoint.y + 22);
  ctx.lineTo(checkpoint.x + 2, checkpoint.y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawForegroundFrames() {
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (const cluster of [
    { x: 120, y: 0, side: "left", height: 420 },
    { x: 1080, y: 0, side: "right", height: 380 }
  ]) {
    drawForegroundSilhouetteCluster(cluster.x, cluster.y, cluster.side, cluster.height);
  }
  ctx.restore();
}

function drawForegroundSilhouetteCluster(x, y, side, height) {
  const sign = side === "left" ? 1 : -1;
  ctx.fillStyle = "rgba(8, 9, 16, 0.82)";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sign * 46, y + 26);
  ctx.lineTo(x + sign * 88, y + height * 0.25);
  ctx.lineTo(x + sign * 70, y + height * 0.55);
  ctx.lineTo(x + sign * 28, y + height * 0.88);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(185, 196, 224, 0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + sign * (14 + i * 8), y + 30 + i * 24);
    ctx.quadraticCurveTo(x + sign * (50 + i * 10), y + 90 + i * 50, x + sign * (24 + i * 6), y + 170 + i * 44);
    ctx.stroke();
  }
}

function getPlayerRenderPolish(player) {
  const verticalSpeed = player.vy ?? 0;
  const groundedSquash = player.onGround ? clamp(Math.abs(player.vx) / 360, 0, 1) * 0.04 : 0;
  const landingSquash = player.onGround && verticalSpeed > -20 && verticalSpeed < 60 ? 0.06 : 0;
  const jumpStretch = !player.onGround && verticalSpeed < -110 ? clamp(Math.abs(verticalSpeed) / 920, 0, 0.14) : 0;
  const fallSquash = !player.onGround && verticalSpeed > 220 ? clamp(verticalSpeed / 1000, 0, 0.1) : 0;
  const dashSmear = player.dashTimer > 0 ? clamp(player.dashTimer / player.dashDuration, 0, 1) : 0;
  const attackFollowThrough = player.attackRecover > 0 ? clamp(player.attackRecover / 0.1, 0, 1) : 0;
  const scaleX = 1 + groundedSquash + landingSquash + fallSquash + dashSmear * 0.16 - jumpStretch * 0.1;
  const scaleY = 1 - groundedSquash - landingSquash - fallSquash + jumpStretch * 0.16;

  return {
    scaleX,
    scaleY,
    offsetX: dashSmear * player.facing * 7 + attackFollowThrough * player.facing * 4,
    offsetY: jumpStretch * -8 + landingSquash * 4,
    capeLag: clamp(player.vx / 28, -12, 12) + dashSmear * player.facing * 8,
    dashSmear
  };
}

function drawStonePlatform(platform) {
  const x = platform.x;
  const y = platform.y;
  const w = platform.w;
  const h = platform.h;
  const theme = getRoomVisualTheme(x + w * 0.5);
  const topDepth = Math.min(16, h);

  ctx.save();

  const faceGradient = ctx.createLinearGradient(x, y, x, y + h);
  faceGradient.addColorStop(0, theme.face);
  faceGradient.addColorStop(1, theme.depth);
  ctx.fillStyle = faceGradient;
  drawIrregularPlatformShape(x, y, w, h, platform.type === "ground" ? 7 : 5, platform.type === "ground" ? 6 : 4);
  ctx.fill();

  ctx.fillStyle = theme.top;
  drawIrregularPlatformTop(x, y, w, topDepth, platform.type === "ground" ? 7 : 5);
  ctx.fill();

  ctx.fillStyle = hexToRgba(theme.depth, 0.36);
  drawUndersideShadow(x, y, w, h);
  ctx.fill();

  drawPlatformTrim(x, y, w, topDepth, theme);
  drawPlatformCracks(x, y, w, h, theme);
  drawPlatformHangers(x, y, w, h, theme);

  ctx.restore();
}

function drawWallPillar(wall) {
  const theme = getRoomVisualTheme(wall.x + wall.w * 0.5);
  const capitalHeight = Math.min(20, wall.h * 0.12);

  ctx.save();
  const bodyGradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
  bodyGradient.addColorStop(0, theme.face);
  bodyGradient.addColorStop(1, theme.depth);
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

  ctx.fillStyle = theme.top;
  ctx.fillRect(wall.x - 2, wall.y, wall.w + 4, capitalHeight);
  ctx.fillStyle = hexToRgba(theme.trim, 0.16);
  ctx.fillRect(wall.x + 4, wall.y + capitalHeight + 6, 4, wall.h - capitalHeight - 18);
  ctx.fillRect(wall.x + wall.w - 8, wall.y + capitalHeight + 12, 3, wall.h - capitalHeight - 24);
  drawWallSeams(wall, theme, capitalHeight);
  ctx.restore();
}

function drawIrregularPlatformShape(x, y, w, h, notchDepth, wobble) {
  ctx.beginPath();
  ctx.moveTo(x, y + notchDepth);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const px = x + w * t;
    const py = y + ((i % 2 === 0 ? 1 : -1) * wobble + notchDepth);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawIrregularPlatformTop(x, y, w, h, wobble) {
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.8);
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const px = x + w * t;
    const py = y + (i % 2 === 0 ? 2 : wobble);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawUndersideShadow(x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h * 0.62);
  ctx.lineTo(x + w - 6, y + h * 0.56);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function drawPlatformTrim(x, y, w, topDepth, theme) {
  ctx.fillStyle = hexToRgba(theme.trim, 0.22);
  for (let i = 0; i < w; i += 28) {
    ctx.fillRect(x + i + 4, y + 3 + (i % 3), 14, Math.max(2, topDepth - 10));
  }

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + topDepth - 1);
  ctx.lineTo(x + w - 4, y + topDepth - 1);
  ctx.stroke();
}

function drawPlatformCracks(x, y, w, h, theme) {
  ctx.strokeStyle = hexToRgba(theme.depth, 0.42);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < w; i += 46) {
    const px = x + 12 + i;
    ctx.beginPath();
    ctx.moveTo(px, y + 7);
    ctx.lineTo(px + 4, y + 18);
    ctx.lineTo(px - 2, y + 24);
    ctx.lineTo(px + 5, y + Math.min(h - 8, 34));
    ctx.stroke();
  }
}

function drawPlatformHangers(x, y, w, h, theme) {
  ctx.strokeStyle = hexToRgba(theme.growth, 0.9);
  ctx.lineWidth = 2;
  const maxHangers = Math.min(4, Math.floor(w / 64));
  for (let i = 0; i < maxHangers; i++) {
    const px = x + 18 + i * (w / Math.max(1, maxHangers));
    const length = Math.min(26, h * 0.35) + (i % 2) * 10;
    ctx.beginPath();
    ctx.moveTo(px, y + h - 2);
    ctx.quadraticCurveTo(px - 6 + i * 2, y + h + length * 0.35, px + 2, y + h + length);
    ctx.stroke();
  }
}

function drawWallSeams(wall, theme, capitalHeight) {
  ctx.strokeStyle = hexToRgba(theme.trim, 0.18);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(wall.x + 4, wall.y + capitalHeight + 10);
  ctx.lineTo(wall.x + wall.w - 5, wall.y + capitalHeight + 6);
  ctx.moveTo(wall.x + 5, wall.y + wall.h * 0.48);
  ctx.lineTo(wall.x + wall.w - 6, wall.y + wall.h * 0.46);
  ctx.stroke();
}

function drawHealthBar(x, y, width, height, hp, displayHp, maxHp) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 9, 14, 0.82)";
  roundRectPath(x, y, width, height, 999);
  ctx.fill();

  const delayedWidth = clamp(displayHp / maxHp, 0, 1) * width;
  const liveWidth = clamp(hp / maxHp, 0, 1) * width;

  ctx.fillStyle = "rgba(170, 68, 68, 0.42)";
  roundRectPath(x, y, delayedWidth, height, 999);
  ctx.fill();

  ctx.fillStyle = "#f1ede5";
  roundRectPath(x, y, liveWidth, height, 999);
  ctx.fill();
  ctx.restore();
}

function roundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function getPlayerTint() {
  const worldTint = state.world === "Light" ? COLORS.light : COLORS.shadow;
  const elementTint = {
    None: COLORS.none,
    Fire: COLORS.fire,
    Ice: COLORS.ice,
    Wind: COLORS.wind
  }[state.element];

  return multiplyHex(worldTint, elementTint);
}

function multiplyHex(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return `rgb(${Math.floor((a.r * b.r) / 255)}, ${Math.floor((a.g * b.g) / 255)}, ${Math.floor((a.b * b.b) / 255)})`;
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16)
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetRun(message) {
  respawnFromSavedCheckpoint(message);
}

function handleDeath(message, reason) {
  playDeathSound();
  showMessage(message, 2.8);
  showDeathOverlay(reason);
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }
    audioContext = new AudioCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.34;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  if (!themeStarted) {
    startTheme();
  }
}

function pauseTheme() {
  if (audioContext && audioContext.state === "running") {
    audioContext.suspend().catch(() => {});
  }
}

function startTheme() {
  if (!audioContext || themeStarted) {
    return;
  }

  themeStarted = true;
  startAmbientBed();
  scheduleThemePhrase();
  themeIntervalId = window.setInterval(scheduleThemePhrase, 6800);
}

function scheduleThemePhrase() {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + 0.05;
  const droneNotes = [
    { t: 0.0, f: 110.0, d: 4.8, g: 0.010 },
    { t: 2.8, f: 103.83, d: 4.7, g: 0.009 }
  ];

  for (const note of droneNotes) {
    playDreadPad(note.f, now + note.t, note.d, note.g);
  }

  const distantChimes = [
    { t: 3.6, f: 277.18, d: 1.9, g: 0.0022 }
  ];

  for (const note of distantChimes) {
    playGhostBell(note.f, now + note.t, note.d, note.g);
  }

  const subDrops = [
    { t: 2.1, f: 55.0, d: 1.5, g: 0.008 }
  ];

  for (const note of subDrops) {
    playSubRumble(note.f, now + note.t, note.d, note.g);
  }
}

function playAttackSound() {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  playFilteredNoiseBurst(now, 0.08, 0.028, 2200, "highpass");
  playBladeTone(640, now, 0.09, 0.03);
  playBladeTone(980, now + 0.01, 0.06, 0.018);
}

function playHitSound() {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  playFilteredNoiseBurst(now, 0.12, 0.035, 480, "bandpass");
  playBassTone(110, now, 0.12, 0.03);
  playBladeTone(180, now + 0.03, 0.12, 0.022);
}

function playDeathSound() {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  playFilteredNoiseBurst(now, 0.25, 0.03, 260, "lowpass");
  playPadTone(220, now, 0.45, 0.022);
  playPadTone(164.81, now + 0.18, 0.55, 0.026);
  playBassTone(123.47, now + 0.34, 0.75, 0.03);
  playBellTone(92.5, now + 0.5, 0.9, 0.012);
}

function playTone(frequency, startTime, duration, gainValue, type) {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function playDreadPad(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const oscA = audioContext.createOscillator();
  const oscB = audioContext.createOscillator();
  const oscC = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  oscA.type = "triangle";
  oscB.type = "sine";
  oscC.type = "sawtooth";

  oscA.frequency.setValueAtTime(frequency, startTime);
  oscB.frequency.setValueAtTime(frequency * 0.5, startTime);
  oscC.frequency.setValueAtTime(frequency * 1.006, startTime);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(620, startTime);
  filter.Q.value = 1.1;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 1.2);
  gain.gain.exponentialRampToValueAtTime(gainValue * 0.5, startTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscA.connect(filter);
  oscB.connect(filter);
  oscC.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscA.start(startTime);
  oscB.start(startTime);
  oscC.start(startTime);
  oscA.stop(startTime + duration + 0.1);
  oscB.stop(startTime + duration + 0.1);
  oscC.stop(startTime + duration + 0.1);
}

function playPadTone(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const oscA = audioContext.createOscillator();
  const oscB = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  oscA.type = "triangle";
  oscB.type = "sine";
  oscA.frequency.setValueAtTime(frequency, startTime);
  oscB.frequency.setValueAtTime(frequency * 1.003, startTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, startTime);
  filter.Q.value = 0.8;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscA.start(startTime);
  oscB.start(startTime);
  oscA.stop(startTime + duration + 0.1);
  oscB.stop(startTime + duration + 0.1);
}

function playBassTone(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(280, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playSubRumble(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(4.2, startTime);
  lfoGain.gain.value = 3.5;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(140, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(startTime);
  lfo.start(startTime);
  osc.stop(startTime + duration + 0.05);
  lfo.stop(startTime + duration + 0.05);
}

function playBellTone(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const oscA = audioContext.createOscillator();
  const oscB = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscA.type = "sine";
  oscB.type = "triangle";
  oscA.frequency.setValueAtTime(frequency, startTime);
  oscB.frequency.setValueAtTime(frequency * 2.01, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(masterGain);

  oscA.start(startTime);
  oscB.start(startTime);
  oscA.stop(startTime + duration + 0.05);
  oscB.stop(startTime + duration + 0.05);
}

function playGhostBell(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const oscA = audioContext.createOscillator();
  const oscB = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  oscA.type = "sine";
  oscB.type = "triangle";
  oscA.frequency.setValueAtTime(frequency, startTime);
  oscB.frequency.setValueAtTime(frequency * 2.7, startTime);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, startTime);
  filter.Q.value = 1.8;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  oscA.start(startTime);
  oscB.start(startTime);
  oscA.stop(startTime + duration + 0.05);
  oscB.stop(startTime + duration + 0.05);
}

function playBladeTone(frequency, startTime, duration, gainValue) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.62, startTime + duration);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, startTime);
  filter.Q.value = 2.5;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function playFilteredNoiseBurst(startTime, duration, gainValue, frequency, filterType) {
  if (!audioContext) {
    return;
  }

  const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, startTime);
  filter.Q.value = 1.4;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(startTime);
}

function startAmbientBed() {
  if (!audioContext || ambientNoiseNode) {
    return;
  }

  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }

  ambientNoiseNode = audioContext.createBufferSource();
  ambientNoiseNode.buffer = buffer;
  ambientNoiseNode.loop = true;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 180;

  const bandpass = audioContext.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 90;
  bandpass.Q.value = 0.4;

  ambientNoiseGain = audioContext.createGain();
  ambientNoiseGain.gain.value = 0.004;

  ambientNoiseNode.connect(lowpass);
  lowpass.connect(bandpass);
  bandpass.connect(ambientNoiseGain);
  ambientNoiseGain.connect(masterGain);
  ambientNoiseNode.start();
}

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

updateHud();
requestAnimationFrame(loop);
