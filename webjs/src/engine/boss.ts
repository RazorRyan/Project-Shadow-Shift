export interface BossController {
  phase: string;
  lastAttackId: string | null;
  attackCatalog: any[];
  phaseThresholds: { id: string; hpRatio: number }[];
  introWakeX: number;
}

export function createBossController(config: any): BossController {
  return {
    phase: config.initialPhase ?? "phase-1",
    lastAttackId: null,
    attackCatalog: config.attackCatalog ?? [],
    phaseThresholds: config.phaseThresholds ?? [],
    introWakeX: config.introWakeX ?? 0
  };
}

export function resolveBossPhase(enemy: any, controller: BossController) {
  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  let resolvedPhase = controller.phaseThresholds[0]?.id ?? controller.phase;
  for (const threshold of controller.phaseThresholds) {
    if (hpRatio <= threshold.hpRatio) resolvedPhase = threshold.id;
  }
  const changed = resolvedPhase !== controller.phase;
  controller.phase = resolvedPhase;
  return { phase: resolvedPhase, changed };
}

export function chooseBossAttack(controller: BossController, context: any) {
  const candidates = controller.attackCatalog
    .filter((a) => !a.phase || a.phase === controller.phase)
    .filter((a) => !a.canUse || a.canUse(context));

  if (candidates.length === 0) return null;

  let bestAttack = candidates[0];
  let bestScore = -Infinity;
  for (const attack of candidates) {
    const score = typeof attack.score === "function" ? attack.score(context) : (attack.weight ?? 1);
    const penalty = attack.id === controller.lastAttackId ? 0.75 : 1;
    const total = score * penalty;
    if (total > bestScore) { bestScore = total; bestAttack = attack; }
  }
  controller.lastAttackId = bestAttack.id;
  return bestAttack;
}
