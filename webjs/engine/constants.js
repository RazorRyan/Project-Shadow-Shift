(function initializeShadowShiftConstants(global) {
  const constants = {
    BASE_CANVAS_WIDTH: 1280,
    BASE_CANVAS_HEIGHT: 720,
    MAX_PARTICLES: 180,
    MAX_SLASH_EFFECTS: 10,
    SAVE_KEY: "shadow-shift-web-save"
  };

  global.ShadowShiftConstants = constants;
})(window);
