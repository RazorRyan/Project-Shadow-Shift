import { ABILITY_REGISTRY, normalizeAbilityId, sanitizeAbilityList } from "../data/abilityData.js";

/**
 * Create a runtime ability system.
 * @param {string[]} unlockedIds - ability IDs to start with unlocked
 */
export function createAbilitySystem(unlockedIds = []) {
  const unlocked = new Set(sanitizeAbilityList(unlockedIds));

  return {
    has(id) {
      const normalizedId = normalizeAbilityId(id);
      return normalizedId ? unlocked.has(normalizedId) : false;
    },

    hasAny(ids = []) {
      return ids.some((id) => this.has(id));
    },

    hasAll(ids = []) {
      return ids.every((id) => this.has(id));
    },

    get(id) {
      const normalizedId = normalizeAbilityId(id);
      if (!normalizedId) {
        return null;
      }
      return ABILITY_REGISTRY[normalizedId] ?? null;
    },

    unlock(id) {
      const normalizedId = normalizeAbilityId(id);
      if (!normalizedId) {
        return false;
      }
      unlocked.add(normalizedId);
      return true;
    },

    lock(id) {
      const normalizedId = normalizeAbilityId(id);
      if (!normalizedId) {
        return false;
      }
      unlocked.delete(normalizedId);
      return true;
    },

    listUnlocked() {
      return sanitizeAbilityList([...unlocked]);
    },

    /** Returns a plain array suitable for save serialization. */
    serialize() {
      return sanitizeAbilityList([...unlocked]);
    },
  };
}
