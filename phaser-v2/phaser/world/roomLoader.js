import { getRoomData } from "./roomData.js";

/**
 * Load a room from data into the scene.
 * Populates `solids` static group with solid tile blocks.
 * Returns layout metadata compatible with GameScene expectations.
 */
export function loadRoom(scene, solids, roomId) {
  const data = getRoomData(roomId);
  if (!data) {
    console.warn(`[roomLoader] Unknown room: ${roomId}`);
    return null;
  }

  const { tileSize, tiles, shadowTiles = [], label, spawns, exits = [], enemySpawns = [], dummySpawns = [], checkpoints = [], npcSpawns = [] } = data;

  // Build solid tiles into existing solids group
  for (let row = 0; row < tiles.length; row++) {
    for (let col = 0; col < tiles[row].length; col++) {
      if (tiles[row][col] === -1) continue;
      const wx = col * tileSize + tileSize * 0.5;
      const wy = row * tileSize + tileSize * 0.5;
      const block = solids.create(wx, wy, "solid-block");
      block.setDisplaySize(tileSize, tileSize);
      block.setTint(0x2a3548);
      block.refreshBody();
    }
  }

  // Build shadow tiles into a separate static group (disabled at start)
  const shadowGroup = scene.physics.add.staticGroup();
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

  const spawn = spawns?.default ?? spawns?.left ?? { x: 120, y: 544 };

  return { label, spawn, spawns: spawns ?? { default: spawn }, exits, enemySpawns, dummySpawns, checkpoints, npcSpawns, shadowGroup };
}
