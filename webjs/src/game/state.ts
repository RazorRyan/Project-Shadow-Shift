/**
 * createGameState — factory that produces a fresh, mutable runtime state object
 * from any LevelDefinition.
 *
 * SRP: this module only knows how to initialise state from a blueprint.
 * It does NOT hydrate runtime systems (enemy state machines, entity registry,
 * etc.) — that is done by initializeStateRuntime() in main.ts after creation.
 */

import { LevelDefinition } from "../level/types";
import { BASE_MOVEMENT_TUNING } from "../engine/movement";

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Creates a brand-new game state from a level blueprint.
 *
 * All level arrays are deep-cloned so they can be mutated at runtime without
 * affecting the original definition (allowing future level-reset without
 * reloading the module).
 */
export function createGameState(level: LevelDefinition) {
  // Deep-clone all mutable level data via JSON round-trip.
  // We deliberately keep this simple — no structuredClone polyfill needed since
  // the level data only contains plain JSON-serialisable values.
  const clonedLevel = JSON.parse(JSON.stringify({
    rooms: level.rooms,
    platforms: level.platforms,
    shadowPlatforms: level.shadowPlatforms,
    walls: level.walls,
    puzzlePlatforms: level.puzzlePlatforms,
    enemies: level.enemies,
    pickups: level.pickups,
    checkpoints: level.checkpoints,
    secretCaches: level.secretCaches,
    hazards: level.hazards,
    puzzles: level.puzzles,
    gate: level.gate,
    barrier: level.barrier,
    exitZone: level.exitZone
  }));

  const firstCheckpointId = level.checkpoints[0]?.id ?? "start";
  const firstRoomId = level.rooms[0]?.id ?? "start";

  return {
    // -----------------------------------------------------------------------
    // Level meta
    // -----------------------------------------------------------------------
    levelName: level.levelName,
    worldWidth: level.worldWidth,
    floorY: level.floorY,
    gravity: level.gravity,

    // -----------------------------------------------------------------------
    // World state
    // -----------------------------------------------------------------------
    world: "Light" as const,
    element: "None",

    // -----------------------------------------------------------------------
    // Level data (mutable copies)
    // -----------------------------------------------------------------------
    ...clonedLevel,

    // -----------------------------------------------------------------------
    // Abilities and progression (merged from level definition)
    // -----------------------------------------------------------------------
    abilityUnlocked: { ...level.initialAbilities },
    progression: JSON.parse(JSON.stringify(level.initialProgression)),

    // -----------------------------------------------------------------------
    // Player
    // -----------------------------------------------------------------------
    player: createInitialPlayer(level.playerStart),

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------
    currentRoomId: firstRoomId,
    roomState: {
      visitedRooms: { [firstRoomId]: true }
    },

    // -----------------------------------------------------------------------
    // Checkpoint tracking
    // -----------------------------------------------------------------------
    activeCheckpointId: firstCheckpointId,
    savedCheckpointId: firstCheckpointId,
    nearbyCheckpointId: null as string | null,
    bossIntroShown: false,

    // -----------------------------------------------------------------------
    // Progression route tracking
    // -----------------------------------------------------------------------
    routeState: {
      lastAnnouncedRouteId: null as string | null
    },

    // -----------------------------------------------------------------------
    // Camera
    // -----------------------------------------------------------------------
    camera: { x: 0, smooth: 0.12 },

    // -----------------------------------------------------------------------
    // Combat effects
    // -----------------------------------------------------------------------
    combat: { hitStop: 0, screenShake: 0, screenShakeStrength: 0 },

    // -----------------------------------------------------------------------
    // Visual effects pools
    // -----------------------------------------------------------------------
    particles: [] as any[],
    slashEffects: [] as any[],

    // -----------------------------------------------------------------------
    // Environment
    // -----------------------------------------------------------------------
    environment: { shadowRestEchoTimer: 0 },

    // -----------------------------------------------------------------------
    // Procedural layout
    // -----------------------------------------------------------------------
    proceduralLayout: {
      seed: `${level.levelName.toLowerCase().replace(/\s+/g, "-")}-v1`,
      rerollCount: 0,
      route: [] as any[],
      validation: { valid: true, errors: [] as string[] }
    },

    // -----------------------------------------------------------------------
    // UI / game-flow
    // -----------------------------------------------------------------------
    messageTimer: 0,
    started: false,
    gameWon: false,
    isDead: false,
    debugInvulnerable: false,
    puzzleState: { debugVisible: false },

    // Routes contain isAvailable() callbacks — not JSON-clonable — so keep a
    // direct reference instead of deep-cloning them.
    progressionRoutes: level.progressionRoutes,

    // -----------------------------------------------------------------------
    // Debug toggles
    // -----------------------------------------------------------------------
    debug: {
      showStateLabels: false,
      showCombatBoxes: false,
      showRequirements: false,
      showSaveState: false,
      showProceduralLayout: false
    }
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createInitialPlayer(start: { x: number; y: number }) {
  return {
    x: start.x,
    y: start.y,
    w: 42,
    h: 64,
    vx: 0,
    vy: 0,
    facing: 1,
    moveAxis: 0,
    onGround: false,
    onWall: false,
    wallSliding: false,
    wallDirection: 0,
    lastWallDirection: 0,
    wallJumpGraceTimer: 0,
    moveSpeed: BASE_MOVEMENT_TUNING.moveSpeed,
    jumpForce: BASE_MOVEMENT_TUNING.jumpForce,
    dashSpeed: BASE_MOVEMENT_TUNING.dashSpeed,
    dashDuration: BASE_MOVEMENT_TUNING.dashDuration,
    dashTimer: 0,
    dashCooldown: 0,
    dashCooldownDuration: BASE_MOVEMENT_TUNING.dashCooldownDuration,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    wallSlideSpeed: BASE_MOVEMENT_TUNING.wallSlideSpeed,
    wallJumpLock: 0,
    jumpReleased: false,
    jumpCutReady: false,
    jumpCutMultiplier: BASE_MOVEMENT_TUNING.jumpCutMultiplier,
    traversalUpgrades: {
      doubleJump: false,
      glide: false,
      phaseStep: false,
      grapple: false
    },
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
  };
}
