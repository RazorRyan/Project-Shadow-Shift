export const COMBO_ATTACK_DEFINITIONS = [
  {
    id: "combo-1",
    damageBonus: 0,
    widthBonus: 0,
    height: 44,
    offsetY: 12,
    activeTimeMs: 100,
    cooldownMs: 200,
    recoveryMs: 110,
    movementImpulse: 90,
    knockback: 240,
    comboWindowMs: 300,
    queueWindowMs: 90,
    finisher: false,
    hitTag: "light"
  },
  {
    id: "combo-2",
    damageBonus: 0,
    widthBonus: 10,
    height: 46,
    offsetY: 10,
    activeTimeMs: 110,
    cooldownMs: 190,
    recoveryMs: 120,
    movementImpulse: 110,
    knockback: 285,
    comboWindowMs: 280,
    queueWindowMs: 85,
    finisher: false,
    hitTag: "heavy"
  },
  {
    id: "combo-3",
    damageBonus: 1,
    widthBonus: 22,
    height: 50,
    offsetY: 8,
    activeTimeMs: 130,
    cooldownMs: 280,
    recoveryMs: 160,
    movementImpulse: 135,
    knockback: 360,
    comboWindowMs: 0,
    queueWindowMs: 0,
    finisher: true,
    hitTag: "finisher"
  }
];

export const PLAYER_COMBAT_CONFIG = {
  baseDamage: 1,
  attackWidth: 62,
  attackKeyBufferMs: 120,
  hitstopMs: {
    light: 45,
    heavy: 60,
    finisher: 70,
    pogo: 50
  },
  slashColors: {
    normal: 0xf5eee2,
    heavy: 0xf0b690,
    finisher: 0xffd48c,
    pogo: 0xc9f3ff
  }
};
