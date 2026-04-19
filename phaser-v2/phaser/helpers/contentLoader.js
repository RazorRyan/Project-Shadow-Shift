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
