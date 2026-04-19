/** Tile indices: E = empty (-1), S = solid (0) */
const E = -1;

export const ROOM_REGISTRY = {
  "outer-rampart": {
    label: "Outer Rampart",
    theme: "rampart",
    objectiveHint: "Reach the Dash Core",
    markerTitle: "Eclipse Keep",
    markerSubtitle: "Outer rampart",
    tileSize: 64,
    worldWidth: 1280,
    worldHeight: 720,
    platforms: [
      { x: 0, y: 620, w: 420, h: 100, type: "ground" },
      { x: 520, y: 620, w: 260, h: 100, type: "ground" },
      { x: 920, y: 620, w: 220, h: 100, type: "ground" },
      { x: 240, y: 530, w: 120, h: 16, type: "ledge" },
      { x: 670, y: 470, w: 96, h: 16, type: "ledge" },
      { x: 1180, y: 538, w: 84, h: 16, type: "ledge" },
    ],
    walls: [
      { x: 1120, y: 430, w: 30, h: 190 },
    ],
    blockers: [
      { id: "gate", x: 1030, y: 460, w: 34, h: 160, kind: "gate" },
    ],
    hazards: [
      { x: 468, y: 604, w: 34, h: 16, kind: "spikes", world: "Both", damage: 1 },
      { x: 1148, y: 604, w: 96, h: 16, kind: "spikes", world: "Light", damage: 1 },
    ],
    shadowPlatforms: [
      { x: 430, y: 470, w: 78, h: 14, world: "Shadow" },
      { x: 802, y: 544, w: 94, h: 14, world: "Shadow" },
      { x: 1080, y: 492, w: 74, h: 14, world: "Shadow" },
    ],
    pickupMarkers: [
      {
        id: "dash-core",
        x: 880,
        y: 574,
        w: 28,
        h: 28,
        label: "Dash Core",
        kind: "dash",
        reward: "dash",
      },
    ],
    secretMarkers: [
      {
        id: "rampart-reliquary",
        x: 310,
        y: 490,
        w: 28,
        h: 28,
        label: "Rampart Reliquary",
        kind: "secret",
      },
    ],
    gateMarker: { x: 1030, y: 460, w: 34, h: 160, label: "Ash Gate" },
    tiles: [[E]],
    shadowTiles: [],
    spawns: {
      default: { x: 120, y: 544 },
      left: { x: 120, y: 544 },
      right: { x: 1190, y: 544 },
    },
    exits: [
      { id: "right", x: 1230, y: 448, w: 50, h: 128, targetRoom: "ash-gate", spawnId: "left" },
    ],
    enemySpawns: [],
    dummySpawns: [],
    checkpoints: [
      { id: "start", label: "Outer Rampart", x: 120, y: 540, w: 28, h: 72, spawnId: "left" },
      { id: "gate", label: "Ash Gate", x: 1120, y: 548, w: 28, h: 72, spawnId: "right" },
    ],
    npcSpawns: [
      { x: 240, y: 560, dialogueId: "ashen_warden", label: "Ashen Warden", promptText: "[Z] Hear warning" },
    ],
  },

  "ash-gate": {
    label: "Ash Gate",
    theme: "ash",
    objectiveHint: "Use Fire and strike the ash barrier",
    markerTitle: "Ash Gate",
    markerSubtitle: "Break the sealed approach",
    tileSize: 64,
    worldWidth: 1280,
    worldHeight: 720,
    platforms: [
      { x: 0, y: 620, w: 200, h: 100, type: "ground" },
      { x: 320, y: 620, w: 220, h: 100, type: "ground" },
      { x: 700, y: 620, w: 260, h: 100, type: "ground" },
      { x: 1120, y: 620, w: 160, h: 100, type: "ground" },
      { x: 200, y: 470, w: 86, h: 16, type: "ledge" },
      { x: 470, y: 406, w: 100, h: 16, type: "ledge" },
      { x: 770, y: 354, w: 94, h: 16, type: "ledge" },
      { x: 950, y: 500, w: 90, h: 16, type: "ledge" },
      { x: 1080, y: 420, w: 110, h: 16, type: "ledge" },
    ],
    walls: [
      { x: 608, y: 300, w: 30, h: 320 },
      { x: 1148, y: 280, w: 36, h: 340 },
    ],
    blockers: [
      { id: "ash-barrier", x: 1000, y: 520, w: 40, h: 100, kind: "barrier" },
    ],
    hazards: [
      { x: 268, y: 604, w: 54, h: 16, kind: "spikes", world: "Both", damage: 1 },
      { x: 918, y: 604, w: 164, h: 16, kind: "spikes", world: "Light", damage: 1 },
    ],
    shadowPlatforms: [
      { x: 268, y: 424, w: 84, h: 14, world: "Shadow" },
      { x: 578, y: 320, w: 90, h: 14, world: "Shadow" },
      { x: 892, y: 446, w: 96, h: 14, world: "Shadow" },
      { x: 1200, y: 394, w: 110, h: 14, world: "Shadow" },
    ],
    barrierMarker: { x: 1000, y: 520, w: 40, h: 100, label: "Ash Barrier" },
    tiles: [[E]],
    shadowTiles: [],
    spawns: {
      default: { x: 120, y: 544 },
      left: { x: 120, y: 544 },
      right: { x: 1210, y: 544 },
    },
    exits: [
      { id: "left", x: 0, y: 448, w: 64, h: 128, targetRoom: "outer-rampart", spawnId: "right" },
      { id: "right", x: 1230, y: 430, w: 50, h: 160, targetRoom: "umbral-galleries", spawnId: "left" },
    ],
    enemySpawns: [
      { x: 60, y: 562, statKey: "keep_skulk" },
      { x: 600, y: 566, statKey: "ash_hound" },
      { x: 480, y: 336, statKey: "moon_watcher" },
      { x: 800, y: 560, statKey: "ash_demon" },
      { x: 1160, y: 432, statKey: "chain_warden" },
    ],
    dummySpawns: [],
    checkpoints: [],
  },

  "umbral-galleries": {
    label: "Umbral Galleries",
    theme: "galleries",
    objectiveHint: "Claim the Umbral Fang",
    markerTitle: "Umbral Galleries",
    markerSubtitle: "Layered climb through the keep",
    tileSize: 64,
    worldWidth: 860,
    worldHeight: 720,
    platforms: [
      { x: 180, y: 620, w: 260, h: 100, type: "ground" },
      { x: 600, y: 620, w: 180, h: 100, type: "ground" },
      { x: 20, y: 340, w: 110, h: 16, type: "ledge" },
      { x: 310, y: 430, w: 120, h: 16, type: "ledge" },
      { x: 640, y: 380, w: 120, h: 16, type: "ledge" },
    ],
    walls: [
      { x: 480, y: 280, w: 36, h: 340 },
    ],
    hazards: [
      { x: 450, y: 604, w: 90, h: 16, kind: "spikes", world: "Shadow", damage: 1 },
      { x: 810, y: 604, w: 74, h: 16, kind: "spikes", world: "Both", damage: 1 },
    ],
    shadowPlatforms: [
      { x: 140, y: 302, w: 110, h: 14, world: "Shadow" },
      { x: 788, y: 338, w: 96, h: 14, world: "Shadow" },
    ],
    pickupMarkers: [
      {
        id: "umbral-fang",
        x: 20,
        y: 354,
        w: 28,
        h: 28,
        label: "Umbral Fang",
        kind: "weapon",
        reward: "weapon",
      },
    ],
    tiles: [[E]],
    shadowTiles: [],
    spawns: {
      default: { x: 36, y: 544 },
      left: { x: 36, y: 544 },
      right: { x: 780, y: 544 },
      sanctum: { x: 36, y: 338 },
    },
    exits: [
      { id: "left", x: 0, y: 430, w: 40, h: 160, targetRoom: "ash-gate", spawnId: "right" },
      { id: "right", x: 810, y: 430, w: 50, h: 160, targetRoom: "eclipse-throne", spawnId: "left" },
    ],
    enemySpawns: [
      { x: 280, y: 322, statKey: "void_watcher" },
      { x: 360, y: 548, statKey: "ash_bulwark" },
      { x: 580, y: 562, statKey: "shadow_walker" },
    ],
    dummySpawns: [],
    checkpoints: [
      { id: "sanctum", label: "Umbral Galleries", x: 12, y: 338, w: 28, h: 72, spawnId: "sanctum" },
    ],
  },

  "eclipse-throne": {
    label: "Eclipse Throne",
    theme: "boss",
    objectiveHint: "Defeat the Eclipse Lord",
    markerTitle: "Eclipse Throne",
    markerSubtitle: "Final ascent into darkness",
    tileSize: 64,
    worldWidth: 620,
    worldHeight: 720,
    platforms: [
      { x: 0, y: 620, w: 620, h: 100, type: "ground" },
      { x: 100, y: 470, w: 120, h: 16, type: "ledge" },
      { x: 320, y: 410, w: 120, h: 16, type: "ledge" },
    ],
    walls: [
      { x: 80, y: 280, w: 36, h: 340 },
      { x: 540, y: 280, w: 36, h: 340 },
    ],
    shadowPlatforms: [
      { x: 228, y: 308, w: 96, h: 14, world: "Shadow" },
    ],
    exitMarkers: [
      { id: "throne-exit", x: 540, y: 430, w: 60, h: 190, label: "Exit Shrine", kind: "exit" },
    ],
    tiles: [[E]],
    shadowTiles: [],
    spawns: {
      default: { x: 40, y: 544 },
      left: { x: 40, y: 544 },
      boss: { x: 40, y: 544 },
    },
    exits: [
      { id: "left", x: 0, y: 430, w: 40, h: 160, targetRoom: "umbral-galleries", spawnId: "right" },
    ],
    enemySpawns: [
      { x: 180, y: 500, statKey: "eclipse_lord" },
    ],
    dummySpawns: [],
    checkpoints: [
      { id: "boss", label: "Eclipse Throne", x: 40, y: 548, w: 28, h: 72, spawnId: "boss" },
    ],
  },
};

export function getRoomData(roomId) {
  return ROOM_REGISTRY[roomId] ?? null;
}
