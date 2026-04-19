export const ELEMENTS = Object.freeze({
  NONE:  "None",
  FIRE:  "Fire",
  ICE:   "Ice",
  WIND:  "Wind",
});

export const ELEMENT_ORDER = [ELEMENTS.NONE, ELEMENTS.FIRE, ELEMENTS.ICE, ELEMENTS.WIND];

export const ELEMENT_COLORS = {
  [ELEMENTS.NONE]:  0xc8d0e8,
  [ELEMENTS.FIRE]:  0xff6030,
  [ELEMENTS.ICE]:   0x60d0ff,
  [ELEMENTS.WIND]:  0x90ffb0,
};

/** Damage multiplier for attacker element vs target weakness.
 *  weakness: element the target is weak to (from enemyStats).
 */
export function getElementMultiplier(attackerElement, targetWeakness) {
  if (!attackerElement || attackerElement === ELEMENTS.NONE) return 1;
  if (!targetWeakness  || targetWeakness  === ELEMENTS.NONE) return 1;
  if (attackerElement === targetWeakness) return 1.75;
  return 1;
}
