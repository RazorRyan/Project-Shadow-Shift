import { SHADOW_SWAP_CONFIG, SHADOW_SWAP_PHASES } from "../data/shadowSwapConfig.js";

/**
 * Core Shadow Swap system.
 * Tracks world phase ("light" | "shadow") and notifies listeners on swap.
 */
export function createShadowSwapSystem({ initialPhase = SHADOW_SWAP_PHASES.LIGHT, cooldownMs = SHADOW_SWAP_CONFIG.cooldownMs } = {}) {
  let phase = initialPhase;
  let nextSwapTime = 0;
  const listeners = [];

  function notify() {
    for (const cb of listeners) {
      cb(phase);
    }
  }

  return {
    getPhase() {
      return phase;
    },

    isShadow() {
      return phase === SHADOW_SWAP_PHASES.SHADOW;
    },

    canSwap(now = 0) {
      return now >= nextSwapTime;
    },

    setPhase(nextPhase, { silent = false } = {}) {
      if (nextPhase !== SHADOW_SWAP_PHASES.LIGHT && nextPhase !== SHADOW_SWAP_PHASES.SHADOW) {
        return false;
      }
      phase = nextPhase;
      if (!silent) {
        notify();
      }
      return true;
    },

    requestSwap({ now = 0, force = false } = {}) {
      if (!force && !this.canSwap(now)) {
        return { swapped: false, phase, reason: "cooldown" };
      }

      phase = phase === SHADOW_SWAP_PHASES.LIGHT
        ? SHADOW_SWAP_PHASES.SHADOW
        : SHADOW_SWAP_PHASES.LIGHT;
      nextSwapTime = now + cooldownMs;
      notify();
      return { swapped: true, phase };
    },

    reset({ phase: nextPhase = SHADOW_SWAP_PHASES.LIGHT, silent = false } = {}) {
      nextSwapTime = 0;
      return this.setPhase(nextPhase, { silent });
    },

    /**
     * Register a callback invoked with the new phase string on every swap.
     * @param {(phase: "light"|"shadow") => void} callback
     */
    onSwap(callback, { immediate = false } = {}) {
      listeners.push(callback);
      if (immediate) {
        callback(phase);
      }
    },
  };
}
