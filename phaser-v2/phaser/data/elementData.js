export const ELEMENTS = Object.freeze({
  NONE:  "None",
  FIRE:  "Fire",
  ICE:   "Ice",
  WIND:  "Wind",
});

export const DEFAULT_ELEMENT = ELEMENTS.NONE;
export const ELEMENT_ORDER = [ELEMENTS.NONE, ELEMENTS.FIRE, ELEMENTS.ICE, ELEMENTS.WIND];

export const ELEMENT_COLORS = {
  [ELEMENTS.NONE]:  0xc8d0e8,
  [ELEMENTS.FIRE]:  0xff6030,
  [ELEMENTS.ICE]:   0x60d0ff,
  [ELEMENTS.WIND]:  0x90ffb0,
};

export const ELEMENT_REGISTRY = Object.freeze({
  [ELEMENTS.NONE]: {
    id: ELEMENTS.NONE,
    label: "None",
    color: ELEMENT_COLORS[ELEMENTS.NONE],
  },
  [ELEMENTS.FIRE]: {
    id: ELEMENTS.FIRE,
    label: "Fire",
    color: ELEMENT_COLORS[ELEMENTS.FIRE],
  },
  [ELEMENTS.ICE]: {
    id: ELEMENTS.ICE,
    label: "Ice",
    color: ELEMENT_COLORS[ELEMENTS.ICE],
  },
  [ELEMENTS.WIND]: {
    id: ELEMENTS.WIND,
    label: "Wind",
    color: ELEMENT_COLORS[ELEMENTS.WIND],
  },
});

export function isKnownElement(element) {
  return Object.hasOwn(ELEMENT_REGISTRY, element);
}

export function normalizeElement(element) {
  return isKnownElement(element) ? element : DEFAULT_ELEMENT;
}

/** Damage multiplier for attacker element vs target weakness.
 *  weakness: element the target is weak to (from enemyStats).
 */
export function getElementMultiplier(attackerElement, targetWeakness) {
  const attacker = normalizeElement(attackerElement);
  const weakness = normalizeElement(targetWeakness);
  if (attacker === ELEMENTS.NONE) return 1;
  if (weakness === ELEMENTS.NONE) return 1;
  if (attacker === weakness) return 1.75;
  return 1;
}

export function getElementReaction(attackerElement, targetWeakness) {
  const attacker = normalizeElement(attackerElement);
  const weakness = normalizeElement(targetWeakness);
  const multiplier = getElementMultiplier(attacker, weakness);

  if (attacker === ELEMENTS.NONE || weakness === ELEMENTS.NONE) {
    return {
      attacker,
      weakness,
      multiplier,
      isWeakness: false,
      label: "",
      color: ELEMENT_COLORS[attacker] ?? ELEMENT_COLORS[ELEMENTS.NONE],
    };
  }

  if (multiplier > 1) {
    return {
      attacker,
      weakness,
      multiplier,
      isWeakness: true,
      label: `WEAK x${multiplier.toFixed(2)}`,
      color: ELEMENT_COLORS[attacker],
    };
  }

  return {
    attacker,
    weakness,
    multiplier,
    isWeakness: false,
    label: "",
    color: ELEMENT_COLORS[attacker] ?? ELEMENT_COLORS[ELEMENTS.NONE],
  };
}
