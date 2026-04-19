import { ELEMENT_ORDER, ELEMENTS } from "../data/elementData.js";

export function createElementSystem(initialElement = ELEMENTS.NONE) {
  let current = initialElement;
  const listeners = [];

  return {
    getElement() { return current; },

    cycleNext() {
      const idx = ELEMENT_ORDER.indexOf(current);
      current = ELEMENT_ORDER[(idx + 1) % ELEMENT_ORDER.length];
      listeners.forEach(cb => cb(current));
    },

    setElement(el) {
      current = el;
      listeners.forEach(cb => cb(current));
    },

    onChange(cb) { listeners.push(cb); },
  };
}
