/**
 * AI tuning data for enemy types.
 * Consumed by concrete AI entity classes.
 */
export const RUIN_HUSK_AI = {
  idleMs: 1200,
  patrolDurationMs: 3000,
  patrolRadius: 90,
  patrolSpeed: 52,
  detectionRange: 280,
  loseRange: 380,
  chaseSpeed: 110,
  attackRange: 64,
  attackTelegraphMs: 300,
  attackLungeMs: 180,
  attackLungeSpeed: 220,
  attackDamage: 1,
  recoverMs: 500,
  phaseModifiers: {
    light: {
      patrolSpeedMultiplier: 1,
      chaseSpeedMultiplier: 1,
      attackLungeSpeedMultiplier: 1,
      detectionRangeMultiplier: 1,
      attackRangeMultiplier: 1,
      attackDamageBonus: 0,
      nameSuffix: "",
    },
    shadow: {
      patrolSpeedMultiplier: 1.2,
      chaseSpeedMultiplier: 1.24,
      attackLungeSpeedMultiplier: 1.18,
      detectionRangeMultiplier: 1.18,
      attackRangeMultiplier: 1.1,
      attackDamageBonus: 1,
      nameSuffix: " [Shadow]",
    },
  },
  stateTints: {
    idle: 0xb06850,
    patrol: 0xc07a5c,
    chase: 0xd18a68,
    attackTelegraph: 0xff5530,
    attackLunge: 0xf0a060,
    recover: 0x8f9ac0
  },
  phaseTints: {
    light: 0xffffff,
    shadow: 0xb884ff,
  }
};

export const RUIN_OVERSEER_BOSS_AI = {
  introMs: 700,
  phases: [
    {
      hpRatio: 1,
      stalkMs: 1200,
      telegraphMs: 180,
      stalkSpeed: 84,
      sweepMs: 700,
      sweepSpeed: 240,
      recoverMs: 560,
      sweepTriggerRange: 128,
      attackWidth: 42,
      attackDamage: 1,
      tint: 0xcc5533,
      attackTint: 0xff7a4f,
      recoverTint: 0x9f88c9,
      introMs: 700,
    },
    {
      hpRatio: 0.5,
      stalkMs: 980,
      telegraphMs: 150,
      stalkSpeed: 112,
      sweepMs: 760,
      sweepSpeed: 300,
      recoverMs: 420,
      sweepTriggerRange: 164,
      attackWidth: 60,
      attackDamage: 2,
      tint: 0xe26d4f,
      attackTint: 0xffba6d,
      recoverTint: 0xc6a8ff,
      introMs: 520,
    },
  ],
};
