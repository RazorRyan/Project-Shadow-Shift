/**
 * Boss stat definitions.
 * Phases are HP fraction thresholds (1.0 → 0.0) at which phase changes fire.
 */
export const BOSS_DATA = {
  ruin_overseer: {
    statKey: "ruin_overseer",
    label: "Ruin Overseer",
    maxHp: 80,
    weakness: "Fire",
    textureKey: "enemy-grunt",
    tint: 0xcc5533,
    width: 52,
    height: 68,
    damageOnContact: 2,
    /** HP fractions at which new phases trigger (descending order) */
    phaseThresholds: [0.6, 0.3],
    phaseNames: ["Rampant", "Frenzied"],
  },
};
