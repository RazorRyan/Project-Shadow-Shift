export function createHitbox(options: any) {
  return {
    ownerType: options.ownerType,
    ownerId: options.ownerId,
    team: options.team,
    x: options.x, y: options.y, w: options.w, h: options.h,
    lifetime: options.lifetime ?? 0,
    damage: options.damage ?? 0,
    knockbackX: options.knockbackX ?? 0,
    knockbackTime: options.knockbackTime ?? 0,
    staggerTime: options.staggerTime ?? 0,
    impactPower: options.impactPower ?? 1,
    hitTag: options.hitTag ?? "light",
    element: options.element ?? "None",
    profileId: options.profileId ?? null
  };
}

export function createHurtbox(targetType: string, targetId: string, rect: any, team = "enemy") {
  return { targetType, targetId, team, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

export function getEnemyImpactTuning(enemy: any) {
  switch (enemy.type) {
    case "demon":       return { weight: 1.45, knockbackScale: 0.7,  staggerScale: 0.78, staggerThreshold: 1.55, hitstopBonus: 0.01 };
    case "watcher":     return { weight: 0.82, knockbackScale: 0.78, staggerScale: 0.88, staggerThreshold: 1.05, hitstopBonus: 0 };
    case "bulwark":     return { weight: 2.05, knockbackScale: 0.48, staggerScale: 0.55, staggerThreshold: 2.15, hitstopBonus: 0.014 };
    case "hound":       return { weight: 0.9,  knockbackScale: 1.05, staggerScale: 0.96, staggerThreshold: 1.1,  hitstopBonus: 0.002 };
    case "oracle":      return { weight: 1.9,  knockbackScale: 0.55, staggerScale: 0.52, staggerThreshold: 2.2,  hitstopBonus: 0.015 };
    case "revenant":    return { weight: 1.6,  knockbackScale: 0.6,  staggerScale: 0.68, staggerThreshold: 1.85, hitstopBonus: 0.012 };
    case "shadowWalker":return { weight: 1,    knockbackScale: 0.9,  staggerScale: 0.92, staggerThreshold: 1.2,  hitstopBonus: 0 };
    default:            return { weight: 0.95, knockbackScale: 1,    staggerScale: 1,    staggerThreshold: 1,    hitstopBonus: 0 };
  }
}

export function getImpactPowerForHit(hitbox: any): number {
  if (hitbox.hitTag === "finisher") return 2.5;
  if (hitbox.hitTag === "pogo") return 1.35;
  if (hitbox.hitTag === "heavy") return 1.8;
  return 1;
}

export function getReactionTypeFromHit(hitbox: any): string {
  if (hitbox.hitTag === "finisher") return "finisher";
  if (hitbox.hitTag === "pogo") return "pogo";
  if (hitbox.element && hitbox.element !== "None") return "elemental";
  if (hitbox.hitTag === "heavy") return "heavy";
  return "light";
}

export function getReactionDuration(reactionType: string): number {
  switch (reactionType) {
    case "finisher": return 0.24;
    case "pogo": return 0.2;
    case "heavy": case "elemental": return 0.18;
    default: return 0.16;
  }
}
