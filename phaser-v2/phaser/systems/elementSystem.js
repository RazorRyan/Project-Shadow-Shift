import { DEFAULT_ELEMENT, ELEMENT_ORDER, ELEMENT_REGISTRY, normalizeElement } from "../data/elementData.js";

export function createElementSystem(initialElement = DEFAULT_ELEMENT) {
  let current = normalizeElement(initialElement);
  const listeners = [];

  function notify() {
    listeners.forEach((cb) => cb(current));
  }

  return {
    getElement() { return current; },

    getData() {
      return ELEMENT_REGISTRY[current];
    },

    is(element) {
      return current === normalizeElement(element);
    },

    cycleNext() {
      const idx = ELEMENT_ORDER.indexOf(current);
      current = ELEMENT_ORDER[(idx + 1) % ELEMENT_ORDER.length];
      notify();
      return current;
    },

    setElement(el) {
      const next = normalizeElement(el);
      if (next === current) {
        return current;
      }
      current = next;
      notify();
      return current;
    },

    onChange(cb, { immediate = false } = {}) {
      listeners.push(cb);
      if (immediate) {
        cb(current);
      }
    },
  };
}
