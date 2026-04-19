import { getRoomData } from "./roomData.js";
import { validateRoomDefinition } from "../helpers/contentLoader.js";

/**
 * Load a room from data into the scene.
 * Populates `solids` static group with solid tile blocks.
 * Returns layout metadata compatible with GameScene expectations.
 */
export function loadRoom(scene, solids, roomId) {
  const rawData = getRoomData(roomId);
  if (!rawData) {
    console.warn(`[roomLoader] Unknown room: ${roomId}`);
    return null;
  }

  const data = validateRoomDefinition(roomId, rawData);
  const {
    tileSize,
    tiles,
    platforms = [],
    walls = [],
    hazards = [],
    blockers = [],
    pickupMarkers = [],
    secretMarkers = [],
    exitMarkers = [],
    shadowPlatforms = [],
    shadowTiles = [],
    label,
    theme = "rampart",
    objectiveHint = "",
    markerTitle = label,
    markerSubtitle = objectiveHint,
    spawns,
    exits = [],
    enemySpawns = [],
    dummySpawns = [],
    checkpoints = [],
    npcSpawns = [],
    worldWidth: authoredWorldWidth,
    worldHeight: authoredWorldHeight,
    gateMarker = null,
    barrierMarker = null,
  } = data;
  const rows = tiles.length;
  const cols = tiles.reduce((max, row) => Math.max(max, row.length), 0);
  const rectWorldWidth = [...platforms, ...walls, ...shadowPlatforms].reduce(
    (max, rect) => Math.max(max, rect.x + rect.w),
    0
  );
  const rectWorldHeight = [...platforms, ...walls, ...shadowPlatforms].reduce(
    (max, rect) => Math.max(max, rect.y + rect.h),
    0
  );
  const worldWidth = authoredWorldWidth ?? Math.max(cols * tileSize, rectWorldWidth, 1280);
  const worldHeight = authoredWorldHeight ?? Math.max(rows * tileSize, rectWorldHeight, 720);

  const solidTint = theme === "ash" ? 0x4a3530 : 0x2a3548;

  if (platforms.length || walls.length) {
    for (const rect of [...platforms, ...walls]) {
      const block = solids.create(rect.x + rect.w * 0.5, rect.y + rect.h * 0.5, "solid-block");
      block.setDisplaySize(rect.w, rect.h);
      block.setTint(solidTint);
      block.refreshBody();
    }
  } else {
    // Build solid tiles into existing solids group
    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row].length; col++) {
        if (tiles[row][col] === -1) continue;
        const wx = col * tileSize + tileSize * 0.5;
        const wy = row * tileSize + tileSize * 0.5;
        const block = solids.create(wx, wy, "solid-block");
        block.setDisplaySize(tileSize, tileSize);
        block.setTint(solidTint);
        block.refreshBody();
      }
    }
  }

  // Build shadow tiles into a separate static group (disabled at start)
  const shadowGroup = scene.physics.add.staticGroup();
  if (shadowPlatforms.length) {
    for (const rect of shadowPlatforms) {
      const block = shadowGroup.create(rect.x + rect.w * 0.5, rect.y + rect.h * 0.5, "shadow-tile");
      block.setDisplaySize(rect.w, rect.h);
      block.refreshBody();
      block.setVisible(false);
      block.body.enable = false;
    }
  } else {
    for (let row = 0; row < shadowTiles.length; row++) {
      for (let col = 0; col < shadowTiles[row].length; col++) {
        if (shadowTiles[row][col] === -1) continue;
        const wx = col * tileSize + tileSize * 0.5;
        const wy = row * tileSize + tileSize * 0.5;
        const block = shadowGroup.create(wx, wy, "shadow-tile");
        block.setDisplaySize(tileSize, tileSize);
        block.refreshBody();
        block.setVisible(false);
        block.body.enable = false;
      }
    }
  }

  const spawn = spawns?.default ?? spawns?.left ?? { x: 120, y: 544 };

  return {
    label,
    theme,
    objectiveHint,
    markerTitle,
    markerSubtitle,
    platforms,
    walls,
    hazards,
    blockers,
    shadowPlatforms,
    spawn,
    spawns: spawns ?? { default: spawn },
    exits,
    enemySpawns,
    dummySpawns,
    checkpoints,
    npcSpawns,
    pickupMarkers,
    secretMarkers,
    exitMarkers,
    gateMarker,
    barrierMarker,
    shadowGroup,
    worldWidth,
    worldHeight,
  };
}
