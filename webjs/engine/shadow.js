(function initializeShadowShiftShadow(global) {
  function isWorldEntityActive(entity, world) {
    const entityWorld = entity?.world ?? entity?.worldMode ?? "Both";
    return entityWorld === "Both" || entityWorld === world;
  }

  function getEnemyWorldAffinity(enemy) {
    switch (enemy.type) {
      case "shadowWalker":
      case "oracle":
      case "revenant":
        return "Shadow";
      case "watcher":
        return "Light";
      case "bulwark":
        return "Light";
      case "hound":
        return "Both";
      default:
        return "Both";
    }
  }

  function getEnemyWorldModifier(enemy, state) {
    const affinity = enemy.worldAffinity ?? getEnemyWorldAffinity(enemy);
    if (affinity === "Both") {
      return {
        affinity,
        phase: "neutral",
        damageTakenMultiplier: 1,
        speedMultiplier: 1,
        contactDamageBonus: 0
      };
    }

    if (state.world === affinity) {
      return {
        affinity,
        phase: "empowered",
        damageTakenMultiplier: 0.85,
        speedMultiplier: 1.08,
        contactDamageBonus: 0
      };
    }

    return {
      affinity,
      phase: "exposed",
      damageTakenMultiplier: 1.22,
      speedMultiplier: 0.9,
      contactDamageBonus: -0.25
    };
  }

  function applyWorldSwapReactiveState(state) {
    const summary = {
      exposedEnemies: 0,
      empoweredEnemies: 0,
      activeHazards: 0
    };

    for (const enemy of state.enemies ?? []) {
      enemy.worldAffinity = enemy.worldAffinity ?? getEnemyWorldAffinity(enemy);
      enemy.worldPhase = getEnemyWorldModifier(enemy, state);
      if (enemy.worldPhase.phase === "exposed") {
        summary.exposedEnemies += 1;
      } else if (enemy.worldPhase.phase === "empowered") {
        summary.empoweredEnemies += 1;
      }
    }

    for (const hazard of state.hazards ?? []) {
      hazard.world = hazard.world ?? "Both";
      if (isWorldEntityActive(hazard, state.world)) {
        summary.activeHazards += 1;
      }
    }

    return summary;
  }

  global.ShadowShiftShadow = {
    isWorldEntityActive,
    getEnemyWorldAffinity,
    getEnemyWorldModifier,
    applyWorldSwapReactiveState
  };
})(window);
