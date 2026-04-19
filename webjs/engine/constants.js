(function initializeShadowShiftConstants(global) {
  const constants = {
    BASE_CANVAS_WIDTH: 1280,
    BASE_CANVAS_HEIGHT: 720,
    MAX_PARTICLES: 180,
    MAX_SLASH_EFFECTS: 10,
    SAVE_KEY: "shadow-shift-web-save",
    COLORS: {
      light: "#eadfa0",
      shadow: "#6677d6",
      none: "#ffffff",
      fire: "#ff7b4a",
      ice: "#8bdcff",
      wind: "#a9ffb3",
      playerCore: "#f4efe1",
      cape: "#191826",
      steel: "#c1cbdb",
      enemy: "#cf5c7b",
      enemyHit: "#fff1f1",
      gate: "#7d6c52",
      gateOpen: "#8bf8c9",
      burnable: "#6b4d32",
      burnableHot: "#8d3b24",
      pickupDash: "#f4d87c",
      pickupWeapon: "#9be8ff",
      goblin: "#8cb34d",
      shadowWalker: "#6d6fc9",
      demon: "#cf534f",
      watcher: "#7ed7ff",
      bulwark: "#d3c196",
      hound: "#ff8d6a"
    }
  };

  global.ShadowShiftConstants = constants;
})(window);
