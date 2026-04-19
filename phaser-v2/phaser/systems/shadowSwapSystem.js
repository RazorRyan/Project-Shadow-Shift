/**
 * Core Shadow Swap system.
 * Tracks world phase ("light" | "shadow") and notifies listeners on swap.
 */
export function createShadowSwapSystem() {
  let phase = "light";
  const listeners = [];

  return {
    getPhase() {
      return phase;
    },

    swap() {
      phase = phase === "light" ? "shadow" : "light";
      for (const cb of listeners) {
        cb(phase);
      }
    },

    /**
     * Register a callback invoked with the new phase string on every swap.
     * @param {(phase: "light"|"shadow") => void} callback
     */
    onSwap(callback) {
      listeners.push(callback);
    },
  };
}
