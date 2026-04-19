import type {
  World, WorldMode, WorldAffinity, Enemy, Hazard,
  WorldModifier, WorldSwapState, WorldSwapSummary
} from "./types";

export interface WorldEntityRect {
  world?: WorldMode;
  worldMode?: WorldMode;
  [key: string]: unknown;
}

export function isWorldEntityActive(entity: WorldEntityRect, world: World): boolean {
  const entityWorld = entity?.world ?? entity?.worldMode ?? "Both";
  return entityWorld === "Both" || entityWorld === world;
}

export function getEnemyWorldAffinity(enemy: Pick<Enemy, "type">): WorldAffinity {
  switch (enemy.type) {
    case "shadowWalker": case "oracle": case "revenant": return "Shadow";
    case "watcher": case "bulwark": return "Light";
    default: return "Both";
  }
}

export function getEnemyWorldModifier(
  enemy: Pick<Enemy, "type" | "worldAffinity">,
  state: { world: World }
): WorldModifier {
  const affinity = enemy.worldAffinity ?? getEnemyWorldAffinity(enemy);
  if (affinity === "Both") {
    return { affinity, phase: "neutral", damageTakenMultiplier: 1, speedMultiplier: 1, contactDamageBonus: 0 };
  }
  if (state.world === affinity) {
    return { affinity, phase: "empowered", damageTakenMultiplier: 0.85, speedMultiplier: 1.08, contactDamageBonus: 0 };
  }
  return { affinity, phase: "exposed", damageTakenMultiplier: 1.22, speedMultiplier: 0.9, contactDamageBonus: -0.25 };
}

export function applyWorldSwapReactiveState(state: WorldSwapState): WorldSwapSummary {
  const summary: WorldSwapSummary = { exposedEnemies: 0, empoweredEnemies: 0, activeHazards: 0 };
  for (const enemy of state.enemies ?? []) {
    enemy.worldAffinity = enemy.worldAffinity ?? getEnemyWorldAffinity(enemy);
    enemy.worldPhase = getEnemyWorldModifier(enemy, state);
    if (enemy.worldPhase.phase === "exposed") summary.exposedEnemies += 1;
    else if (enemy.worldPhase.phase === "empowered") summary.empoweredEnemies += 1;
  }
  for (const hazard of (state.hazards ?? []) as Hazard[]) {
    hazard.world = hazard.world ?? "Both";
    if (isWorldEntityActive(hazard as WorldEntityRect, state.world)) summary.activeHazards += 1;
  }
  return summary;
}
