/**
 * LevelDefinition — the contract any stage/level must implement.
 *
 * SOLID / extensibility note:
 *   - Open/Closed: add a new stage by creating a new file that satisfies this interface.
 *   - No existing game-loop code needs to change when a new level is added.
 *   - All mutable runtime data (enemy timers, camera, particles, etc.) lives in game
 *     state produced by createGameState(); this file contains only the static blueprint.
 */

// ---------------------------------------------------------------------------
// Navigation / room model
// ---------------------------------------------------------------------------

export interface Room {
  id: string;
  bounds: { x: number; y: number; w: number; h: number };
  theme: string;
  spawnCheckpointId: string;
  label: string;
  objectiveHint?: string;
  revisitHint?: string;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: string; // "ground" | "ledge" | custom
}

export interface ShadowPlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  world: string; // "Shadow" | "Light"
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PuzzlePlatformInit {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  world: string;
  sourcePuzzleId: string;
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

/**
 * A single route entry that drives the HUD objective hint system.
 * Each level owns its own route list — no global definitions to modify.
 */
export interface ProgressionRoute {
  id: string;
  kind: "main" | "optional";
  roomId: string;
  /** Short imperative shown in the objective HUD. */
  objective: string;
  /** One-sentence context shown when entering the relevant room. */
  summary: string;
  /**
   * Evaluated every frame against the live game state.
   * Receives the full state object — intentionally permissive so each level
   * can query whatever flags or entity state it needs without a fixed schema.
   */
  isAvailable: (state: any) => boolean;
}

/** Serialisable progression data owned by the level (distinct from runtime state). */
export interface InitialProgression {
  keyItems: Record<string, boolean>;
  worldFlags: Record<string, boolean>;
  optionalSecrets: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Level definition (the full blueprint)
// ---------------------------------------------------------------------------

export interface LevelDefinition {
  /** Human-readable name shown in debug overlays and save payloads. */
  levelName: string;

  /** Total horizontal extent of the level in world-space pixels. */
  worldWidth: number;

  /** Y-coordinate of the "ground" reference used for fall-death detection. */
  floorY: number;

  /** Gravity constant (px/s²). */
  gravity: number;

  // Rooms ----------------------------------------------------------------
  rooms: Room[];

  // Geometry -------------------------------------------------------------
  platforms: Platform[];
  shadowPlatforms: ShadowPlatform[];
  walls: Wall[];
  puzzlePlatforms: PuzzlePlatformInit[];

  // Entities (initial data — runtime fields are added by initializeStateRuntime)
  /** Enemy seed data. Runtime props (aiStateMachine, bossController, etc.) are hydrated
   *  by initializeEnemyRuntime when the game starts. */
  enemies: any[];

  /** Keyed pickup map, e.g. { dash: {...}, weapon: {...} }. */
  pickups: Record<string, any>;
  checkpoints: any[];
  secretCaches: any[];
  hazards: any[];
  puzzles: any[];

  // Named blockers / exit ------------------------------------------------
  gate: any;
  barrier: any;
  exitZone: any;

  // Player ---------------------------------------------------------------
  playerStart: { x: number; y: number };

  // Abilities available at the very start (before any save is applied) ---
  initialAbilities: {
    Dash: boolean;
    ShadowSwap: boolean;
    FireShift: boolean;
    IceShift: boolean;
    WindShift: boolean;
  };

  // Progression ----------------------------------------------------------
  initialProgression: InitialProgression;

  /**
   * Ordered list of route definitions for this level.
   * The first matching "main" route becomes the current objective.
   */
  progressionRoutes: ProgressionRoute[];
}
