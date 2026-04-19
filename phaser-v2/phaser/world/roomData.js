/** Tile indices: E = empty (-1), S = solid (0) */
const E = -1, S = 0;

export const ROOM_REGISTRY = {
  "ruin-hall": {
    label: "Ruin Hall",
    tileSize: 64,
    // 20 cols x 12 rows  (1280 x 768 px)
    tiles: [
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 0
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 1
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 2
      [E,E,E,E,E,E,E,E,E,E,E,S,S,E,E,E,E,E,E,E], // row 3 — platform
      [E,E,E,E,E,S,S,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 4 — platform
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,S,S,E,E,E], // row 5 — platform
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 6
      [S,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 7 — left wall
      [S,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // row 8 — left wall
      [S,S,S,S,S,S,E,E,E,S,S,S,S,E,E,E,S,S,S,S], // row 9 — floor + gaps
      [S,S,S,S,S,S,E,E,E,S,S,S,S,E,E,E,S,S,S,S], // row 10
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S], // row 11 — underground
    ],
    // shadow-phase-only tiles (Phase 16)
    shadowTiles: [
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 0
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 1
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 2
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 3
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 4
      [E,E,S,S,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 5 — shadow float platform
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 6
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 7
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 8
      [E,E,E,E,E,E,S,S,S,E,E,E,E,S,S,S,E,E,E,E], // 9 — bridges over gaps
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 10
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 11
    ],
    spawns: {
      default: { x: 120, y: 544 },
      left:    { x: 120, y: 544 },
      right:   { x: 1190, y: 544 },
    },
    exits: [
      { id: "right", x: 1230, y: 448, w: 50, h: 128, targetRoom: "ruin-hall-2", spawnId: "left" },
    ],
    enemySpawns:  [{ x: 704, y: 544, statKey: "ruin_husk" }],
    dummySpawns:  [
      { x: 1056, y: 544, label: "Ruin Husk" },
      { x: 1152, y: 544, label: "Guard Shell" },
    ],
  },

  "ruin-hall-2": {
    label: "Ruin Depths",
    tileSize: 64,
    tiles: [
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 0
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 1
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 2
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 3
      [E,E,E,E,E,E,E,S,S,E,E,E,E,E,E,E,E,E,E,E], // 4 — platform
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,S,S,E,E,E], // 5 — platform
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 6
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 7
      [E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E], // 8
      [S,S,S,S,S,S,S,S,S,S,E,E,S,S,S,S,S,S,S,S], // 9 — floor + gap
      [S,S,S,S,S,S,S,S,S,S,E,E,S,S,S,S,S,S,S,S], // 10
      [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S], // 11
    ],
    shadowTiles: [],
    spawns: {
      default: { x: 120, y: 544 },
      left:    { x: 120, y: 544 },
      right:   { x: 1190, y: 544 },
    },
    exits: [
      { id: "left", x: 0, y: 448, w: 64, h: 128, targetRoom: "ruin-hall", spawnId: "right" },
    ],
    enemySpawns: [
      { x: 820, y: 544, statKey: "ruin_husk" },
      { x: 1000, y: 544, statKey: "ruin_husk" },
    ],
    dummySpawns: [],
  },
};

export function getRoomData(roomId) {
  return ROOM_REGISTRY[roomId] ?? null;
}
