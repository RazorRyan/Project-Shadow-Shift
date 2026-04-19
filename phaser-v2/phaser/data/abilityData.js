export const ABILITY_IDS = Object.freeze({
  DOUBLE_JUMP: "double_jump",
  WALL_JUMP: "wall_jump",
  DASH: "dash",
  SHADOW_SWAP: "shadow_swap",
});

export const ABILITY_REGISTRY = Object.freeze({
  [ABILITY_IDS.DOUBLE_JUMP]: {
    id: ABILITY_IDS.DOUBLE_JUMP,
    label: "Double Jump",
    category: "movement",
  },
  [ABILITY_IDS.WALL_JUMP]: {
    id: ABILITY_IDS.WALL_JUMP,
    label: "Wall Jump",
    category: "movement",
  },
  [ABILITY_IDS.DASH]: {
    id: ABILITY_IDS.DASH,
    label: "Dash",
    category: "movement",
  },
  [ABILITY_IDS.SHADOW_SWAP]: {
    id: ABILITY_IDS.SHADOW_SWAP,
    label: "Shadow Swap",
    category: "world",
  },
});

export const STARTING_ABILITY_IDS = Object.freeze([
  ABILITY_IDS.WALL_JUMP,
]);

export function isKnownAbilityId(id) {
  return Object.hasOwn(ABILITY_REGISTRY, id);
}

export function normalizeAbilityId(id) {
  if (typeof id !== "string") {
    return null;
  }

  const normalizedId = id.trim().toLowerCase();
  return isKnownAbilityId(normalizedId) ? normalizedId : null;
}

export function sanitizeAbilityList(abilityIds = []) {
  const seen = new Set();
  const normalized = [];

  for (const abilityId of abilityIds) {
    const normalizedId = normalizeAbilityId(abilityId);
    if (!normalizedId || seen.has(normalizedId)) {
      continue;
    }
    seen.add(normalizedId);
    normalized.push(normalizedId);
  }

  return normalized;
}

export function getStartingAbilityIds() {
  return [...STARTING_ABILITY_IDS];
}
