(function initializeShadowShiftUtils(global) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function approachValue(current, target, delta) {
    if (current < target) {
      return Math.min(current + delta, target);
    }
    if (current > target) {
      return Math.max(current - delta, target);
    }
    return target;
  }

  function hexToRgb(hex) {
    const cleaned = hex.replace("#", "");
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16)
    };
  }

  function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function multiplyHex(hexA, hexB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return `rgb(${Math.floor((a.r * b.r) / 255)}, ${Math.floor((a.g * b.g) / 255)}, ${Math.floor((a.b * b.b) / 255)})`;
  }

  global.ShadowShiftUtils = {
    clamp,
    approachValue,
    hexToRgb,
    hexToRgba,
    multiplyHex
  };
})(window);
