/**
 * Data-driven enemy stat definitions.
 * EnemyBase reads from here at construction time.
 */
export const ENEMY_STATS = {
  ruin_husk: {
    label: "Ruin Husk",
    maxHp: 4,
    width: 40,
    height: 62,
    textureKey: "enemy-grunt",
    tint: 0xb06850,
    invulnMs: 220,
    hurtFlashMs: 130,
  },
};
