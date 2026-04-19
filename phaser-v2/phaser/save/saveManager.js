const SAVE_KEY = "shadow-shift-v2-save";
const SAVE_VERSION = 1;

export const saveManager = {
  /**
   * @param {{ roomId, playerHp, unlockedAbilities }} state
   */
  save(state) {
    const data = {
      version: SAVE_VERSION,
      roomId: state.roomId ?? "ruin-hall",
      playerHp: state.playerHp ?? 5,
      unlockedAbilities: state.unlockedAbilities ?? [],
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* storage unavailable */ }
  },

  /** @returns {object|null} */
  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.version !== SAVE_VERSION) return null;
      return data;
    } catch (_) {
      return null;
    }
  },

  clear() {
    try { window.localStorage.removeItem(SAVE_KEY); } catch (_) { /* noop */ }
  },

  getDefault() {
    return {
      version: SAVE_VERSION,
      roomId: "ruin-hall",
      playerHp: 5,
      unlockedAbilities: [],
    };
  },
};
