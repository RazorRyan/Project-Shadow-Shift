/**
 * Eclipse Keep — stage 1 level definition.
 *
 * Extensibility note: to add a new stage, create a new file that exports a
 * `LevelDefinition` constant and wire it into main.ts.  No game-loop code
 * needs to change.
 */

import { BASE_CANVAS_HEIGHT } from "../engine/constants";
import { LevelDefinition, ProgressionRoute } from "./types";

// ---------------------------------------------------------------------------
// Progression routes — ordered: first matching "main" route is the objective
// ---------------------------------------------------------------------------

const ECLIPSE_KEEP_ROUTES: ProgressionRoute[] = [
  {
    id: "recover-dash-core",
    kind: "main",
    roomId: "outer-rampart",
    objective: "Reach the Dash Core",
    summary: "A forgotten movement relic waits in the rampart.",
    isAvailable: (s) => s.pickups.dash.active
  },
  {
    id: "breach-rampart-gate",
    kind: "main",
    roomId: "outer-rampart",
    objective: "Dash through the sealed gate",
    summary: "Your new momentum can crack open the keep route.",
    isAvailable: (s) => s.abilityUnlocked.Dash && s.gate.active
  },
  {
    id: "burn-ash-barrier",
    kind: "main",
    roomId: "ash-gate",
    objective: "Use Fire and strike the ash barrier",
    summary: "The blocked ascent should yield to a burning stance.",
    isAvailable: (s) => !s.gate.active && s.barrier.active
  },
  {
    id: "claim-umbral-fang",
    kind: "main",
    roomId: "umbral-galleries",
    objective: "Claim the Umbral Fang",
    summary: "A stronger blade waits deeper in the galleries.",
    isAvailable: (s) => !s.barrier.active && s.pickups.weapon.active
  },
  {
    id: "revisit-rampart-reliquary",
    kind: "optional",
    roomId: "outer-rampart",
    objective: "Return to the rampart reliquary",
    summary: "A sealed cache near the opening ledges may answer a stronger blade.",
    isAvailable: (s) =>
      s.player.weaponStage >= 1 &&
      s.abilityUnlocked.Dash &&
      !s.progression.optionalSecrets.rampartReliquary
  },
  {
    id: "defeat-eclipse-lord",
    kind: "main",
    roomId: "eclipse-throne",
    objective: "Defeat the Eclipse Lord",
    summary: "The throne will not open while the lord still stands.",
    isAvailable: (s) =>
      !s.pickups.weapon.active && s.enemies.some((e: any) => e.boss && e.alive)
  },
  {
    id: "leave-the-keep",
    kind: "main",
    roomId: "eclipse-throne",
    objective: "Reach the exit shrine",
    summary: "The route out is finally clear.",
    isAvailable: (s) => !s.enemies.some((e: any) => e.boss && e.alive)
  }
];

// ---------------------------------------------------------------------------
// Level definition
// ---------------------------------------------------------------------------

export const ECLIPSE_KEEP_LEVEL: LevelDefinition = {
  levelName: "Eclipse Keep",
  worldWidth: 4040,
  floorY: 620,
  gravity: 1900,

  playerStart: { x: 120, y: 540 },

  initialAbilities: {
    Dash: false,
    ShadowSwap: true,
    FireShift: true,
    IceShift: true,
    WindShift: true
  },

  initialProgression: {
    keyItems: { MoonSeal: false },
    worldFlags: {
      gateOpened: false,
      barrierCleared: false,
      bossAwakened: false,
      bossDefeated: false
    },
    optionalSecrets: { rampartReliquary: false }
  },

  progressionRoutes: ECLIPSE_KEEP_ROUTES,

  // -------------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------------
  rooms: [
    {
      id: "outer-rampart",
      bounds: { x: 0, y: 0, w: 1280, h: BASE_CANVAS_HEIGHT },
      theme: "rampart",
      spawnCheckpointId: "start",
      label: "Outer Rampart",
      objectiveHint: "Reach the Dash Core",
      revisitHint: "The opening ledges hide an old reliquary."
    },
    {
      id: "ash-gate",
      bounds: { x: 1280, y: 0, w: 1280, h: BASE_CANVAS_HEIGHT },
      theme: "ash",
      spawnCheckpointId: "gate",
      label: "Ash Gate",
      objectiveHint: "Break through the sealed path"
    },
    {
      id: "umbral-galleries",
      bounds: { x: 2560, y: 0, w: 860, h: BASE_CANVAS_HEIGHT },
      theme: "galleries",
      spawnCheckpointId: "sanctum",
      label: "Umbral Galleries",
      objectiveHint: "Claim the weapon upgrade"
    },
    {
      id: "eclipse-throne",
      bounds: { x: 3420, y: 0, w: 620, h: BASE_CANVAS_HEIGHT },
      theme: "boss",
      spawnCheckpointId: "boss",
      label: "Eclipse Throne",
      objectiveHint: "Defeat the Eclipse Lord"
    }
  ],

  // -------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------
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

  walls: [
    { x: 1120, y: 430, w: 30, h: 190 },
    { x: 1888, y: 300, w: 30, h: 320 },
    { x: 2428, y: 280, w: 36, h: 340 },
    { x: 3040, y: 280, w: 36, h: 340 },
    { x: 3500, y: 280, w: 36, h: 340 },
    { x: 3960, y: 280, w: 36, h: 340 }
  ],

  puzzlePlatforms: [
    {
      id: "ash-echo-bridge",
      x: 2160,
      y: 438,
      w: 110,
      h: 14,
      world: "Shadow",
      sourcePuzzleId: "ash-echo-bridge",
    }
  ],

  // -------------------------------------------------------------------------
  // Entities
  // -------------------------------------------------------------------------
  enemies: [
    {
      type: "goblin",
      name: "Keep Skulk",
      x: 1340, y: 562, w: 46, h: 58, vx: 110,
      left: 1240, right: 1520,
      hp: 2, displayHp: 2, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 0, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.3,
      baseSpeed: 98, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "watcher",
      name: "Moon Watcher",
      x: 1760, y: 336, w: 40, h: 48, vx: 74,
      left: 1680, right: 1880,
      hp: 2, displayHp: 2, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.4, pauseTimer: 0, burstTimer: 0, alertCooldown: 1.1,
      baseSpeed: 58, baseY: 336, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "demon",
      name: "Ash Demon",
      x: 2080, y: 560, w: 50, h: 60, vx: 92,
      left: 2000, right: 2200,
      hp: 4, displayHp: 4, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.6, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.9,
      baseSpeed: 64, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "shadowWalker",
      name: "Chain Warden",
      x: 2440, y: 432, w: 46, h: 58, vx: 120,
      left: 2340, right: 2580,
      hp: 3, displayHp: 3, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.4, pauseTimer: 0, burstTimer: 0, alertCooldown: 1.1,
      baseSpeed: 112, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "hound",
      name: "Ash Hound",
      x: 1880, y: 566, w: 44, h: 40, vx: 126,
      left: 1760, right: 1980,
      hp: 3, displayHp: 3, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 0.9, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.65,
      baseSpeed: 132, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "watcher",
      name: "Void Watcher",
      x: 2840, y: 322, w: 40, h: 48, vx: 72,
      left: 2740, right: 3000,
      hp: 3, displayHp: 3, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.1, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.7,
      baseSpeed: 62, baseY: 322, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "bulwark",
      name: "Ash Bulwark",
      x: 2920, y: 548, w: 58, h: 72, vx: 58,
      left: 2860, right: 3140,
      hp: 6, displayHp: 6, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.2, pauseTimer: 0, burstTimer: 0, alertCooldown: 1.5,
      baseSpeed: 46, contactDamage: 2, guardFacing: -1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "shadowWalker",
      name: "Shadow Walker",
      x: 3140, y: 562, w: 46, h: 58, vx: 112,
      left: 3060, right: 3260,
      hp: 3, displayHp: 3, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 1.1, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.7,
      baseSpeed: 86, contactDamage: 1, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    },
    {
      type: "oracle",
      name: "Eclipse Lord",
      x: 3600, y: 500, w: 84, h: 104, vx: -66,
      left: 3420, right: 3940,
      hp: 16, displayHp: 16, invuln: 0, hurtTimer: 0, knockbackTimer: 0,
      behaviorTimer: 0.8, pauseTimer: 0, burstTimer: 0, alertCooldown: 0.8,
      baseSpeed: 68, contactDamage: 2, awakened: false, boss: true, alive: true, contactCooldown: 0,
      elementalState: { type: "none", timer: 0, tickTimer: 0, sourceElement: "None", slowMultiplier: 1, tickDamage: 0 }
    }
  ],

  pickups: {
    dash: { x: 880, y: 574, w: 28, h: 28, active: true, label: "Dash Core", roomId: "outer-rampart" },
    weapon: { x: 2580, y: 354, w: 28, h: 28, active: true, label: "Umbral Fang", roomId: "umbral-galleries" }
  },

  checkpoints: [
    {
      id: "start", x: 120, y: 540, w: 28, h: 72,
      label: "Outer Rampart", active: true, roomId: "outer-rampart",
      reactivity: {
        triggers: ["rest", "swap"],
        responses: { rest: { setFlag: "recentlyRested" }, swap: { setFlag: "worldEcho" } }
      }
    },
    {
      id: "gate", x: 1120, y: 548, w: 28, h: 72,
      label: "Ash Gate", active: false, roomId: "outer-rampart",
      reactivity: {
        triggers: ["rest", "swap"],
        responses: { rest: { setFlag: "recentlyRested" }, swap: { setFlag: "worldEcho" } }
      }
    },
    {
      id: "sanctum", x: 2540, y: 338, w: 28, h: 72,
      label: "Umbral Galleries", active: false, roomId: "umbral-galleries",
      reactivity: {
        triggers: ["rest", "swap"],
        responses: { rest: { setFlag: "recentlyRested" }, swap: { setFlag: "worldEcho" } }
      }
    },
    {
      id: "boss", x: 3460, y: 548, w: 28, h: 72,
      label: "Eclipse Throne", active: false, roomId: "eclipse-throne",
      reactivity: {
        triggers: ["rest", "swap"],
        responses: { rest: { setFlag: "recentlyRested" }, swap: { setFlag: "worldEcho" } }
      }
    }
  ],

  secretCaches: [
    {
      id: "rampart-reliquary",
      x: 310, y: 490, w: 28, h: 28, active: true,
      label: "Rampart Reliquary", roomId: "outer-rampart",
      requirements: { abilities: ["Dash"], minWeaponStage: 1 },
      reward: { type: "maxHp", amount: 1, secretId: "rampartReliquary", keyItem: "MoonSeal" },
      reactivity: {
        triggers: ["approach", "swap"],
        responses: { approach: { message: null }, swap: { setFlag: "shadowRevealed" } }
      },
      feedbackTimer: 0,
      failureMessage: "The reliquary yields only to a stronger blade"
    }
  ],

  gate: {
    x: 1030, y: 460, w: 34, h: 160, active: true, roomId: "outer-rampart",
    requirements: { abilities: ["Dash"] },
    reactivity: {
      triggers: ["approach", "attack", "swap"],
      responses: { approach: { message: null }, attack: { message: null }, swap: { setFlag: "worldEcho" } }
    },
    failureMessage: "The path is sealed without Dash"
  },

  barrier: {
    x: 2280, y: 520, w: 40, h: 100, active: true, roomId: "ash-gate",
    requirements: { element: "Fire" },
    reactivity: {
      triggers: ["attack", "swap"],
      responses: { attack: { message: null }, swap: { setFlag: "worldEcho" } }
    },
    failureMessage: "Fire is needed here"
  },

  exitZone: {
    x: 3960, y: 430, w: 60, h: 190,
    roomId: "eclipse-throne",
    requirements: { anyOf: [{ abilities: ["Dash"] }] }
  },

  hazards: [
    { x: 468, y: 604, w: 34, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Both" },
    { x: 1148, y: 604, w: 96, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Light" },
    { x: 1548, y: 604, w: 54, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Both" },
    { x: 2198, y: 604, w: 164, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Light" },
    { x: 3010, y: 604, w: 90, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Shadow" },
    { x: 3370, y: 604, w: 74, h: 16, damage: 1, kind: "spikes", element: "Ice", dampenedTimer: 0, world: "Both" }
  ],

  puzzles: [
    {
      id: "ash-echo-bridge",
      label: "Ash Echo Bridge",
      roomId: "ash-gate",
      persistent: false,
      windowDuration: 7,
      nodes: [
        {
          id: "ember-altar",
          label: "Ember Altar",
          x: 2050, y: 586, radius: 36,
          triggerType: "attack",
          requiredElement: "Fire",
          requiredWorld: "Light",
          duration: 5
        },
        {
          id: "shadow-anchor",
          label: "Shadow Anchor",
          x: 2190, y: 472, radius: 34,
          triggerType: "swap",
          requiredWorld: "Shadow",
          duration: 5
        }
      ]
    }
  ]
};
