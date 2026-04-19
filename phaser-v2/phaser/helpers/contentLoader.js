/**
 * Content loader — validates and processes room/spawn definitions.
 *
 * Provides a typed, validated pipeline for loading room content from
 * data objects.  Every spawn record goes through validateSpawn() before
 * entering the scene, so bad data surfaces early with a clear message.
 */

// ── Schema helpers ────────────────────────────────────────────────────────────

function require(obj, field, type, context) {
  if (obj[field] === undefined || obj[field] === null) {
    throw new Error(`[contentLoader] ${context} missing required field "${field}"`);
  }
  if (typeof obj[field] !== type) {
    throw new Error(
      `[contentLoader] ${context} field "${field}" must be ${type}, got ${typeof obj[field]}`
    );
  }
}

// ── Validators ────────────────────────────────────────────────────────────────

export function validateEnemySpawn(spawn, index) {
  const ctx = `enemySpawn[${index}]`;
  require(spawn, "x", "number", ctx);
  require(spawn, "y", "number", ctx);
  require(spawn, "statKey", "string", ctx);
  return spawn;
}

export function validateDummySpawn(spawn, index) {
  const ctx = `dummySpawn[${index}]`;
  require(spawn, "x", "number", ctx);
  require(spawn, "y", "number", ctx);
  require(spawn, "label", "string", ctx);
  return spawn;
}

export function validateNpcSpawn(spawn, index) {
  const ctx = `npcSpawn[${index}]`;
  require(spawn, "x", "number", ctx);
  require(spawn, "y", "number", ctx);
  require(spawn, "dialogueId", "string", ctx);
  return spawn;
}

export function validateCheckpoint(cp, index) {
  const ctx = `checkpoint[${index}]`;
  require(cp, "id", "string", ctx);
  require(cp, "x", "number", ctx);
  require(cp, "y", "number", ctx);
  require(cp, "w", "number", ctx);
  require(cp, "h", "number", ctx);
  return cp;
}

export function validateSpawnPoint(spawn, context = "spawn") {
  require(spawn, "x", "number", context);
  require(spawn, "y", "number", context);
  return spawn;
}

export function validateSpawnMap(spawns = {}) {
  if (typeof spawns !== "object" || Array.isArray(spawns) || spawns === null) {
    throw new Error("[contentLoader] room spawns must be an object map");
  }

  const validated = Object.fromEntries(
    Object.entries(spawns).map(([spawnId, spawn]) => [
      spawnId,
      validateSpawnPoint(spawn, `spawn["${spawnId}"]`),
    ])
  );

  if (!validated.default) {
    throw new Error('[contentLoader] room spawns must include a "default" spawn');
  }

  return validated;
}

export function validateExit(exit, index) {
  const ctx = `exit[${index}]`;
  require(exit, "id", "string", ctx);
  require(exit, "x", "number", ctx);
  require(exit, "y", "number", ctx);
  require(exit, "w", "number", ctx);
  require(exit, "h", "number", ctx);
  require(exit, "targetRoom", "string", ctx);
  require(exit, "spawnId", "string", ctx);
  return exit;
}

export function validateRect(rect, index, kind = "rect") {
  const ctx = `${kind}[${index}]`;
  require(rect, "x", "number", ctx);
  require(rect, "y", "number", ctx);
  require(rect, "w", "number", ctx);
  require(rect, "h", "number", ctx);
  return rect;
}

export function validateOptionalRectArray(rects = [], kind = "rect") {
  if (!Array.isArray(rects)) {
    throw new Error(`[contentLoader] room field "${kind}" must be an array`);
  }
  return rects.map((rect, index) => validateRect(rect, index, kind));
}

export function validateMarker(marker, index, kind = "marker") {
  const ctx = `${kind}[${index}]`;
  require(marker, "x", "number", ctx);
  require(marker, "y", "number", ctx);
  require(marker, "w", "number", ctx);
  require(marker, "h", "number", ctx);
  if (marker.label !== undefined) {
    require(marker, "label", "string", ctx);
  }
  return marker;
}

export function validateOptionalMarkerArray(markers = [], kind = "marker") {
  if (!Array.isArray(markers)) {
    throw new Error(`[contentLoader] room field "${kind}" must be an array`);
  }
  return markers.map((marker, index) => validateMarker(marker, index, kind));
}

export function validateTileGrid(grid, fieldName) {
  if (!Array.isArray(grid) || grid.length === 0) {
    throw new Error(`[contentLoader] room field "${fieldName}" must be a non-empty row array`);
  }

  grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new Error(`[contentLoader] ${fieldName}[${rowIndex}] must be an array`);
    }
    row.forEach((tile, colIndex) => {
      if (typeof tile !== "number") {
        throw new Error(
          `[contentLoader] ${fieldName}[${rowIndex}][${colIndex}] must be a number`
        );
      }
    });
  });

  return grid;
}

export function validateOptionalTileGrid(grid, fieldName) {
  if (grid === undefined) {
    return [];
  }
  if (!Array.isArray(grid)) {
    throw new Error(`[contentLoader] room field "${fieldName}" must be a row array`);
  }
  if (grid.length === 0) {
    return [];
  }
  return validateTileGrid(grid, fieldName);
}

// ── Room content loader ───────────────────────────────────────────────────────

/**
 * Validates all spawn/content arrays in a room layout object.
 * Mutates nothing — returns validated copies.
 *
 * @param {object} layout — raw room layout definition
 * @returns {object}      — the same layout, with validated arrays
 */
export function validateRoomContent(layout) {
  const enemySpawns  = (layout.enemySpawns  ?? []).map(validateEnemySpawn);
  const dummySpawns  = (layout.dummySpawns  ?? []).map(validateDummySpawn);
  const npcSpawns    = (layout.npcSpawns    ?? []).map(validateNpcSpawn);
  const checkpoints  = (layout.checkpoints  ?? []).map(validateCheckpoint);

  return { ...layout, enemySpawns, dummySpawns, npcSpawns, checkpoints };
}

export function validateRoomDefinition(roomId, room) {
  const ctx = `room["${roomId}"]`;
  require(room, "label", "string", ctx);
  require(room, "tileSize", "number", ctx);

  const platforms = validateOptionalRectArray(room.platforms ?? [], "platform");
  const walls = validateOptionalRectArray(room.walls ?? [], "wall");
  const shadowPlatforms = validateOptionalRectArray(room.shadowPlatforms ?? [], "shadowPlatform");
  const hazards = validateOptionalRectArray(room.hazards ?? [], "hazard");
  const blockers = validateOptionalRectArray(room.blockers ?? [], "blocker");
  const pickupMarkers = validateOptionalMarkerArray(room.pickupMarkers ?? [], "pickupMarker");
  const secretMarkers = validateOptionalMarkerArray(room.secretMarkers ?? [], "secretMarker");
  const exitMarkers = validateOptionalMarkerArray(room.exitMarkers ?? [], "exitMarker");
  const hasRectAuthoredSolids = platforms.length > 0 || walls.length > 0;
  const tiles = hasRectAuthoredSolids
    ? (Array.isArray(room.tiles) ? room.tiles : [[-1]])
    : validateTileGrid(room.tiles, `${ctx}.tiles`);
  const shadowTiles = validateOptionalTileGrid(room.shadowTiles, `${ctx}.shadowTiles`);
  const spawns = validateSpawnMap(room.spawns ?? {});
  const exits = (room.exits ?? []).map(validateExit);
  const content = validateRoomContent(room);

  exits.forEach((exit, index) => {
    if (!spawns[exit.spawnId]) {
      throw new Error(
        `[contentLoader] ${ctx}.exits[${index}] references unknown spawnId "${exit.spawnId}"`
      );
    }
  });

  content.checkpoints.forEach((checkpoint, index) => {
    if (checkpoint.spawnId && !spawns[checkpoint.spawnId]) {
      throw new Error(
        `[contentLoader] ${ctx}.checkpoints[${index}] references unknown spawnId "${checkpoint.spawnId}"`
      );
    }
  });

  return {
    ...room,
    ...content,
    tiles,
    platforms,
    walls,
    hazards,
    blockers,
    pickupMarkers,
    secretMarkers,
    exitMarkers,
    shadowPlatforms,
    shadowTiles,
    spawns,
    exits,
  };
}
