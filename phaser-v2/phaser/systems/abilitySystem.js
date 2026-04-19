/**
 * Known ability IDs — single source of truth.
 */
export const ABILITY_IDS = Object.freeze({
  DOUBLE_JUMP:  "double_jump",
  WALL_JUMP:    "wall_jump",
  DASH:         "dash",
  SHADOW_SWAP:  "shadow_swap",
});

/**
 * Create a runtime ability system.
 * @param {string[]} unlockedIds - ability IDs to start with unlocked
 */
export function createAbilitySystem(unlockedIds = []) {
  const unlocked = new Set(unlockedIds);

  return {
    has(id) {
      return unlocked.has(id);
    },

    unlock(id) {
      unlocked.add(id);
    },

    lock(id) {
      unlocked.delete(id);
    },

    listUnlocked() {
      return [...unlocked];
    },

    /** Returns a plain array suitable for save serialization. */
    serialize() {
      return [...unlocked];
    },
  };
}
