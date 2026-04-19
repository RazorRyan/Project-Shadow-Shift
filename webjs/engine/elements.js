(function initializeShadowShiftElements(global) {
  const ELEMENT_COMBAT_PROFILES = {
    None: {
      damageMultiplier: 1,
      impactBonus: 0,
      knockbackMultiplier: 1,
      hitstopBonus: 0,
      statusEffect: null
    },
    Fire: {
      damageMultiplier: 1,
      impactBonus: 0.06,
      knockbackMultiplier: 1,
      hitstopBonus: 0.004,
      statusEffect: {
        type: "scorch",
        duration: 1.8,
        tickInterval: 0.6,
        tickDamage: 1
      }
    },
    Ice: {
      damageMultiplier: 1,
      impactBonus: 0.08,
      knockbackMultiplier: 0.94,
      hitstopBonus: 0.003,
      statusEffect: {
        type: "chill",
        duration: 1.5,
        slowMultiplier: 0.72
      }
    },
    Wind: {
      damageMultiplier: 1,
      impactBonus: 0.18,
      knockbackMultiplier: 1.18,
      hitstopBonus: 0.002,
      statusEffect: {
        type: "gust",
        duration: 0.5
      }
    }
  };

  const ENEMY_ELEMENT_PROFILES = {
    goblin: {
      vulnerabilities: ["Fire"],
      resistances: []
    },
    watcher: {
      vulnerabilities: ["Wind"],
      resistances: ["Ice"]
    },
    demon: {
      vulnerabilities: ["Ice"],
      resistances: ["Fire"]
    },
    bulwark: {
      vulnerabilities: ["Wind"],
      resistances: ["Fire"]
    },
    hound: {
      vulnerabilities: ["Ice"],
      resistances: []
    },
    shadowWalker: {
      vulnerabilities: ["Fire"],
      resistances: ["Wind"]
    },
    oracle: {
      vulnerabilities: ["Wind"],
      resistances: ["Ice"]
    },
    revenant: {
      vulnerabilities: ["Fire"],
      resistances: ["Wind"]
    }
  };

  function getElementCombatProfile(element) {
    return ELEMENT_COMBAT_PROFILES[element] ?? ELEMENT_COMBAT_PROFILES.None;
  }

  function getEnemyElementProfile(enemy) {
    return ENEMY_ELEMENT_PROFILES[enemy.type] ?? {
      vulnerabilities: [],
      resistances: []
    };
  }

  function resolveElementalHit(enemy, hitbox) {
    const element = hitbox.element ?? "None";
    const combatProfile = getElementCombatProfile(element);
    const enemyProfile = getEnemyElementProfile(enemy);
    let damageMultiplier = combatProfile.damageMultiplier;
    let impactBonus = combatProfile.impactBonus;
    let knockbackMultiplier = combatProfile.knockbackMultiplier;
    let reactionText = null;

    if (enemyProfile.vulnerabilities.includes(element)) {
      damageMultiplier *= 1.5;
      impactBonus += 0.16;
      knockbackMultiplier *= 1.08;
      reactionText = `${element} weakness`;
    } else if (enemyProfile.resistances.includes(element)) {
      damageMultiplier *= 0.7;
      impactBonus = Math.max(0, impactBonus - 0.08);
      knockbackMultiplier *= 0.9;
      reactionText = `${element} resisted`;
    }

    const damage = Math.max(1, Math.round(hitbox.damage * damageMultiplier));
    const statusEffect = element !== "None" && !enemyProfile.resistances.includes(element) ? combatProfile.statusEffect : null;

    return {
      element,
      damage,
      impactBonus,
      knockbackMultiplier,
      hitstopBonus: combatProfile.hitstopBonus,
      reactionText,
      statusEffect
    };
  }

  function applyEnemyElementalStatus(enemy, elementalResult) {
    if (!elementalResult.statusEffect || elementalResult.element === "None") {
      return;
    }

    if (!enemy.elementalState) {
      enemy.elementalState = {
        type: "none",
        timer: 0,
        tickTimer: 0,
        sourceElement: "None",
        slowMultiplier: 1
      };
    }

    const nextState = {
      type: elementalResult.statusEffect.type,
      timer: elementalResult.statusEffect.duration,
      tickTimer: elementalResult.statusEffect.tickInterval ?? 0,
      sourceElement: elementalResult.element,
      slowMultiplier: elementalResult.statusEffect.slowMultiplier ?? 1,
      tickDamage: elementalResult.statusEffect.tickDamage ?? 0
    };

    enemy.elementalState = nextState;
  }

  function updateEnemyElementalState(enemy, dt) {
    if (!enemy.elementalState || enemy.elementalState.type === "none" || enemy.elementalState.timer <= 0) {
      return { damage: 0, expired: false };
    }

    enemy.elementalState.timer = Math.max(0, enemy.elementalState.timer - dt);

    let damage = 0;
    if (enemy.elementalState.type === "scorch") {
      enemy.elementalState.tickTimer -= dt;
      if (enemy.elementalState.tickTimer <= 0) {
        enemy.elementalState.tickTimer += 0.6;
        damage = enemy.elementalState.tickDamage ?? 1;
      }
    }

    const expired = enemy.elementalState.timer <= 0;
    if (expired) {
      enemy.elementalState = {
        type: "none",
        timer: 0,
        tickTimer: 0,
        sourceElement: "None",
        slowMultiplier: 1,
        tickDamage: 0
      };
    }

    return { damage, expired };
  }

  function getEnemyElementSpeedMultiplier(enemy) {
    if (!enemy.elementalState || enemy.elementalState.type === "none" || enemy.elementalState.timer <= 0) {
      return 1;
    }

    if (enemy.elementalState.type === "chill") {
      return enemy.elementalState.slowMultiplier ?? 0.72;
    }
    if (enemy.elementalState.type === "gust") {
      return 1.05;
    }
    return 1;
  }

  function getHazardContactProfile(hazard, activeElement) {
    const dampened = (hazard.dampenedTimer ?? 0) > 0;
    if (dampened) {
      return {
        active: false,
        damage: 0,
        knockbackMultiplier: 0,
        message: "The frost spikes have been tempered"
      };
    }

    let damage = hazard.damage ?? 1;
    let knockbackMultiplier = 1;
    let message = hazard.message ?? "The ice tore through you";

    if (hazard.element === "Ice" && activeElement === "Fire") {
      damage = Math.max(0, damage - 1);
      knockbackMultiplier = 0.78;
      message = "Your fire stance tempers the frozen spikes";
    } else if (hazard.element === "Ice" && activeElement === "Wind") {
      knockbackMultiplier = 0.88;
      message = "The gale carries you across the frost";
    }

    return {
      active: damage > 0,
      damage,
      knockbackMultiplier,
      message
    };
  }

  function applyEnvironmentElementReaction(targetType, target, element) {
    if (!element || element === "None") {
      return { outcome: "none", changed: false, message: null, color: null };
    }

    if (targetType === "barrier") {
      if (element === "Fire") {
        return {
          outcome: "clear",
          changed: true,
          message: "Barrier burned away",
          color: "#ff9f68"
        };
      }
      if (element === "Ice") {
        return {
          outcome: "fail",
          changed: false,
          message: "Ice only hardens the ash barrier",
          color: "#bfefff"
        };
      }
      if (element === "Wind") {
        return {
          outcome: "fail",
          changed: false,
          message: "Wind stirs the ash but cannot break the seal",
          color: "#d8fff1"
        };
      }
    }

    if (targetType === "hazard" && target.kind === "spikes" && target.element === "Ice") {
      if (element === "Fire" && (target.dampenedTimer ?? 0) <= 0) {
        target.dampenedTimer = 4.5;
        return {
          outcome: "temper",
          changed: true,
          message: "Fire tempers the frost spikes",
          color: "#ffbf90"
        };
      }
      if (element === "Wind") {
        return {
          outcome: "gust",
          changed: false,
          message: "Wind skims over the frost spikes",
          color: "#d8fff1"
        };
      }
    }

    return { outcome: "none", changed: false, message: null, color: null };
  }

  function updateEnvironmentElementState(state, dt) {
    for (const hazard of state.hazards ?? []) {
      hazard.dampenedTimer = Math.max(0, (hazard.dampenedTimer ?? 0) - dt);
    }
  }

  global.ShadowShiftElements = {
    getElementCombatProfile,
    getEnemyElementProfile,
    resolveElementalHit,
    applyEnemyElementalStatus,
    updateEnemyElementalState,
    getEnemyElementSpeedMultiplier,
    getHazardContactProfile,
    applyEnvironmentElementReaction,
    updateEnvironmentElementState
  };
})(window);
