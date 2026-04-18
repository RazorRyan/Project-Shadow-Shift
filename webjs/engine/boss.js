(function initializeShadowShiftBoss(global) {
  function createBossController(config) {
    return {
      phase: config.initialPhase ?? "phase-1",
      lastAttackId: null,
      attackCatalog: config.attackCatalog ?? [],
      phaseThresholds: config.phaseThresholds ?? [],
      introWakeX: config.introWakeX ?? 0
    };
  }

  function resolveBossPhase(enemy, controller) {
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    let resolvedPhase = controller.phaseThresholds[0]?.id ?? controller.phase;
    for (const threshold of controller.phaseThresholds) {
      if (hpRatio <= threshold.hpRatio) {
        resolvedPhase = threshold.id;
      }
    }
    const changed = resolvedPhase !== controller.phase;
    controller.phase = resolvedPhase;
    return { phase: resolvedPhase, changed };
  }

  function chooseBossAttack(controller, context) {
    const candidates = controller.attackCatalog
      .filter((attack) => !attack.phase || attack.phase === controller.phase)
      .filter((attack) => !attack.canUse || attack.canUse(context));

    if (candidates.length === 0) {
      return null;
    }

    let bestAttack = candidates[0];
    let bestScore = -Infinity;
    for (const attack of candidates) {
      const score = typeof attack.score === "function" ? attack.score(context) : (attack.weight ?? 1);
      const varietyPenalty = attack.id === controller.lastAttackId ? 0.75 : 1;
      const totalScore = score * varietyPenalty;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAttack = attack;
      }
    }
    controller.lastAttackId = bestAttack.id;
    return bestAttack;
  }

  global.ShadowShiftBoss = {
    createBossController,
    resolveBossPhase,
    chooseBossAttack
  };
})(window);
