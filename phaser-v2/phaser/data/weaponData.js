/**
 * Weapon stage definitions.
 * Each stage overrides base combat config values.
 */
export const WEAPON_STAGES = [
  {
    id: "shard_blade_1",
    label: "Shard Blade I",
    damageMultiplier: 1.0,
    rangeBonus: 0,
    attackTuning: {},
  },
  {
    id: "shard_blade_2",
    label: "Shard Blade II",
    damageMultiplier: 1.25,
    rangeBonus: 12,
    attackTuning: {
      combo: {
        forwardBoostBonus: 14,
        knockbackBonus: 18,
      },
      "combo-3": {
        damageBonus: 1,
        widthBonus: 8,
        cooldownMultiplier: 0.92,
      },
    },
  },
  {
    id: "shard_blade_3",
    label: "Shard Blade III",
    damageMultiplier: 1.6,
    rangeBonus: 26,
    attackTuning: {
      combo: {
        forwardBoostBonus: 24,
        knockbackBonus: 34,
      },
      "combo-2": {
        widthBonus: 8,
        cooldownMultiplier: 0.92,
      },
      "combo-3": {
        damageBonus: 2,
        widthBonus: 16,
        cooldownMultiplier: 0.85,
      },
      downslash: {
        bounceStrengthBonus: 60,
      },
    },
  },
];
