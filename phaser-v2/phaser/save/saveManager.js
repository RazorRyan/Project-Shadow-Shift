import { getStartingAbilityIds, sanitizeAbilityList } from "../data/abilityData.js";
import { DEFAULT_ELEMENT, normalizeElement } from "../data/elementData.js";

const SAVE_KEY = "shadow-shift-v2-save";
const SAVE_VERSION = 1;

function createNormalizedSave(data = {}) {
  const unlockedAbilities = sanitizeAbilityList(data.unlockedAbilities ?? []);
  return {
    version: SAVE_VERSION,
    roomId: data.roomId ?? "outer-rampart",
    spawnId: data.spawnId ?? "default",
    playerHp: data.playerHp ?? 5,
    element: normalizeElement(data.element ?? DEFAULT_ELEMENT),
    unlockedAbilities: unlockedAbilities.length > 0 ? unlockedAbilities : getStartingAbilityIds(),
    weaponStage: data.weaponStage ?? 0,
    visitedRooms: data.visitedRooms ?? [],
    checkpointId: data.checkpointId ?? null,
    worldFlags: {
      barrierCleared: Boolean(data.worldFlags?.barrierCleared),
      bossDefeated: Boolean(data.worldFlags?.bossDefeated),
    },
    savedAt: data.savedAt ?? Date.now(),
  };
}

export const saveManager = {
  /**
   * @param {{ roomId, playerHp, unlockedAbilities }} state
   */
  save(state) {
    const data = createNormalizedSave(state);
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* storage unavailable */ }
    return data;
  },

  /** @returns {object|null} */
  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.version !== SAVE_VERSION) return null;
      return createNormalizedSave(data);
    } catch (_) {
      return null;
    }
  },

  clear() {
    try { window.localStorage.removeItem(SAVE_KEY); } catch (_) { /* noop */ }
  },

  getDefault() {
    return createNormalizedSave();
  },
};
