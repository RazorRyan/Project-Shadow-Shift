/**
 * EnemyAI — movement helpers, state management, and per-type behaviour trees.
 *
 * SRP: this module owns all enemy runtime behaviour.  It does NOT know about
 * the DOM, audio, or save system.  Side effects (messages, particles, screen
 * shake) are delivered through the injected EnemyAIServices interface,
 * keeping the dependency arrows pointing inward.
 */

import { clamp, approachValue } from "../engine/utils";
import { createStateMachine } from "../engine/state-machine";
import { createBossController, resolveBossPhase, chooseBossAttack } from "../engine/boss";
import { getEnemyElementSpeedMultiplier } from "../engine/elements";

// ---------------------------------------------------------------------------
// Injected side-effect services (Dependency Inversion)
// ---------------------------------------------------------------------------

export interface EnemyAIServices {
  showMessage(msg: string): void;
  spawnImpactParticles(x: number, y: number, color: string, count: number, speedMult?: number): void;
  applyScreenShake(duration: number, strength: number): void;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

export function initializeEnemyRuntime(enemy: any): void {
  const startingDirection = Math.sign(enemy.vx) || 1;
  const moveTuning = getEnemyMoveSettings(enemy);
  const startingState = enemy.boss && !enemy.awakened ? "idle" : "patrol";

  enemy.actionCooldown = enemy.actionCooldown != null ? enemy.actionCooldown : (enemy.alertCooldown != null ? enemy.alertCooldown : 0);
  enemy.maxSpeed = enemy.maxSpeed != null ? enemy.maxSpeed : Math.abs(enemy.vx || enemy.baseSpeed || 90);
  enemy.state = enemy.state != null ? enemy.state : startingState;
  enemy.stateTimer = enemy.stateTimer != null ? enemy.stateTimer : 0;
  enemy.patrolDirection = enemy.patrolDirection != null ? enemy.patrolDirection : startingDirection;
  enemy.pendingBlinkOffset = enemy.pendingBlinkOffset != null ? enemy.pendingBlinkOffset : 0;
  enemy.pendingAction = enemy.pendingAction != null ? enemy.pendingAction : null;
  enemy.targetVx = enemy.targetVx != null ? enemy.targetVx : (enemy.vx || 0);
  enemy.accel = enemy.accel != null ? enemy.accel : moveTuning.accel;
  enemy.decel = enemy.decel != null ? enemy.decel : moveTuning.decel;
  enemy.turnSpeed = enemy.turnSpeed != null ? enemy.turnSpeed : moveTuning.turnSpeed;

  if (enemy.boss && !enemy.bossController) {
    enemy.bossController = createBossController({
      initialPhase: "phase-1",
      introWakeX: 2860,
      phaseThresholds: [
        { id: "phase-1", hpRatio: 1 },
        { id: "phase-2", hpRatio: 0.55 }
      ],
      attackCatalog: createBossAttackCatalog(enemy)
    });
  }

  if (!enemy.aiStateMachine) {
    enemy.aiStateMachine = createStateMachine({
      owner: enemy,
      initialState: enemy.state,
      states: createTimedStateDefinitions(
        ["idle", "patrol", "windup", "burst", "recover", "stagger"],
        "state",
        "stateTimer"
      )
    });
  }
}

function createBossAttackCatalog(enemy: any): any[] {
  if (enemy.type !== "oracle") return [];

  return [
    {
      id: "oracle-blink-strike",
      phase: "phase-1",
      canUse: (ctx: any) => ctx.horizontalDistance < 380,
      score: (ctx: any) => ctx.horizontalDistance < 220 ? 2.2 : 1.3,
      buildAction: (ctx: any) => ({
        windup: 0.28,
        action: {
          type: "blink",
          offset: ctx.facingToPlayer * 120,
          travelTime: 0.1,
          burstTime: 0.22,
          speed: 220,
          cooldown: 1.45,
          recoveryTime: 0.22
        }
      })
    },
    {
      id: "oracle-phase2-cross",
      phase: "phase-2",
      canUse: (ctx: any) => ctx.horizontalDistance < 430,
      score: (ctx: any) => ctx.horizontalDistance > 200 ? 2.4 : 1.7,
      buildAction: (ctx: any) => ({
        windup: 0.18,
        action: {
          type: "blink",
          offset: ctx.facingToPlayer * clamp(ctx.horizontalDistance * 0.55, 120, 180),
          travelTime: 0.08,
          burstTime: 0.3,
          speed: 260,
          cooldown: 1.15,
          recoveryTime: 0.18
        }
      })
    },
    {
      id: "oracle-phase2-rush",
      phase: "phase-2",
      canUse: (ctx: any) => ctx.horizontalDistance >= 160,
      score: (ctx: any) => ctx.horizontalDistance >= 280 ? 2.6 : 1.2,
      buildAction: (_ctx: any) => ({
        windup: 0.2,
        action: {
          type: "burst",
          burstTime: 0.34,
          speed: 295,
          cooldown: 1.3,
          recoveryTime: 0.2
        }
      })
    }
  ];
}

// ---------------------------------------------------------------------------
// State-machine helpers
// ---------------------------------------------------------------------------

export function createTimedStateDefinitions(
  stateNames: string[],
  labelField: string,
  timerField: string
): Record<string, any> {
  const definitions: Record<string, any> = {};
  for (const name of stateNames) {
    definitions[name] = {
      enter(owner: any, _previous: string, payload: any = {}) {
        owner[labelField] = name;
        owner[timerField] = payload.duration ?? 0;
      }
    };
  }
  return definitions;
}

export function getEnemyState(enemy: any): string {
  if (!enemy.aiStateMachine) initializeEnemyRuntime(enemy);
  return enemy.aiStateMachine.current ?? enemy.state ?? "patrol";
}

export function setEnemyState(enemy: any, nextState: string, stateTime = 0): void {
  if (enemy.state == null || !enemy.aiStateMachine) initializeEnemyRuntime(enemy);
  const payload = { duration: stateTime };
  if (enemy.aiStateMachine.current === nextState) {
    enemy.aiStateMachine.force(nextState, payload);
    return;
  }
  if (!enemy.aiStateMachine.transition(nextState, payload)) {
    enemy.aiStateMachine.force(nextState, payload);
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function isBulwarkGuardingFront(enemy: any, hitbox: any): boolean {
  if (enemy.type !== "bulwark") return false;
  const hitDir = Math.sign((hitbox.x + hitbox.w * 0.5) - (enemy.x + enemy.w * 0.5)) || enemy.guardFacing || enemy.patrolDirection || 1;
  const facing = enemy.guardFacing || enemy.patrolDirection || 1;
  return hitDir === facing;
}

export function hasBossAlive(enemies: any[]): boolean {
  return enemies.some((e) => e.boss && e.alive);
}

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------

export function getEnemyMoveSettings(enemy: any): { accel: number; decel: number; turnSpeed: number } {
  switch (enemy.type) {
    case "goblin":      return { accel: 900,  decel: 980,  turnSpeed: 1350 };
    case "hound":       return { accel: 1180, decel: 980,  turnSpeed: 1560 };
    case "shadowWalker":return { accel: 760,  decel: 820,  turnSpeed: 1220 };
    case "demon":       return { accel: 680,  decel: 760,  turnSpeed: 1180 };
    case "bulwark":     return { accel: 520,  decel: 720,  turnSpeed: 760  };
    case "watcher":     return { accel: 520,  decel: 560,  turnSpeed: 860  };
    case "oracle":      return { accel: 560,  decel: 600,  turnSpeed: 920  };
    case "revenant":    return { accel: 620,  decel: 660,  turnSpeed: 980  };
    default:            return { accel: 720,  decel: 760,  turnSpeed: 1000 };
  }
}

export function accelerateEnemyTowards(enemy: any, targetVelocity: number, dt: number): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  const reversing = Math.sign(enemy.vx) !== 0 && Math.sign(targetVelocity) !== 0 && Math.sign(enemy.vx) !== Math.sign(targetVelocity);
  const rate = reversing
    ? enemy.turnSpeed
    : Math.abs(targetVelocity) > Math.abs(enemy.vx)
      ? enemy.accel
      : enemy.decel;
  enemy.targetVx = targetVelocity;
  enemy.vx = approachValue(enemy.vx, targetVelocity, rate * dt);
}

export function brakeEnemy(enemy: any, dt: number, brakeMultiplier = 1): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  enemy.targetVx = 0;
  enemy.vx = approachValue(enemy.vx, 0, enemy.turnSpeed * brakeMultiplier * dt);
}

export function moveEnemyByVelocity(enemy: any, dt: number): void {
  enemy.x += enemy.vx * dt;
}

export function moveEnemyInCurrentDirection(enemy: any, dt: number, speedOverride?: number): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  const direction = enemy.patrolDirection || Math.sign(enemy.vx) || 1;
  const speed = speedOverride ?? getEnemyPatrolSpeed(enemy);
  accelerateEnemyTowards(enemy, direction * speed, dt);
  moveEnemyByVelocity(enemy, dt);
}

export function flipEnemyPatrolDirection(enemy: any): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  enemy.patrolDirection *= -1;
  if (enemy.patrolDirection === 0) enemy.patrolDirection = -1;
}

export function tryEnemyPatrolTurn(enemy: any, pauseTime = 0): boolean {
  if (enemy.x <= enemy.left || enemy.x + enemy.w >= enemy.right) {
    enemy.x = clamp(enemy.x, enemy.left, enemy.right - enemy.w);
    flipEnemyPatrolDirection(enemy);
    if (pauseTime > 0) setEnemyState(enemy, "idle", pauseTime);
    return true;
  }
  return false;
}

export function clampEnemyToPatrol(enemy: any): void {
  if (enemy.x <= enemy.left || enemy.x + enemy.w >= enemy.right) {
    enemy.x = clamp(enemy.x, enemy.left, enemy.right - enemy.w);
    flipEnemyPatrolDirection(enemy);
    brakeEnemy(enemy, 1 / 60, 1.6);
    setEnemyState(enemy, "idle", enemy.type === "demon" ? 0.16 : enemy.type === "watcher" ? 0.12 : 0.1);
  }
}

export function getEnemyPatrolSpeed(enemy: any): number {
  const t = performance.now();
  switch (enemy.type) {
    case "goblin":       return enemy.baseSpeed + Math.sin(t * 0.012 + enemy.x * 0.03) * 16;
    case "hound":        return enemy.baseSpeed + Math.sin(t * 0.016 + enemy.x * 0.03) * 18;
    case "shadowWalker": return enemy.baseSpeed;
    case "bulwark":      return enemy.baseSpeed;
    case "demon":        return enemy.baseSpeed;
    case "watcher":      return enemy.baseSpeed + Math.sin(t * 0.006 + enemy.x * 0.01) * 10;
    case "oracle":       return enemy.baseSpeed + Math.sin(t * 0.004 + enemy.x * 0.008) * 8;
    case "revenant":     return enemy.baseSpeed + Math.sin(t * 0.005 + enemy.x * 0.008) * 10;
    default:             return enemy.baseSpeed ?? 90;
  }
}

export function getEnemyContactCooldown(enemy: any): number {
  switch (enemy.type) {
    case "goblin":       return 0.28;
    case "hound":        return 0.36;
    case "shadowWalker": return 0.50;
    case "bulwark":      return 0.78;
    case "demon":        return 0.72;
    case "watcher":      return 0.62;
    case "oracle":       return 0.72;
    case "revenant":     return 0.82;
    default:             return 0.45;
  }
}

// ---------------------------------------------------------------------------
// Action helpers
// ---------------------------------------------------------------------------

export function beginEnemyWindup(enemy: any, anticipationTime: number, direction: number, actionConfig: any): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  enemy.patrolDirection = direction || enemy.patrolDirection || 1;
  enemy.pendingAction = actionConfig;
  setEnemyState(enemy, "windup", anticipationTime);
}

export function beginEnemyRecovery(enemy: any, recoveryTime: number): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  enemy.pendingAction = null;
  setEnemyState(enemy, "recover", recoveryTime);
}

export function beginEnemyStagger(enemy: any, staggerTime: number): void {
  if (enemy.state == null) initializeEnemyRuntime(enemy);
  enemy.pendingAction = null;
  setEnemyState(enemy, "stagger", staggerTime);
}

export function resolveEnemyWindup(enemy: any): boolean {
  const pending = enemy.pendingAction;
  if (!pending) {
    setEnemyState(enemy, "patrol");
    return false;
  }

  if (pending.type === "burst") {
    enemy.actionCooldown = pending.cooldown ?? enemy.actionCooldown;
    enemy.maxSpeed = pending.speed ?? enemy.maxSpeed;
    setEnemyState(enemy, "burst", pending.burstTime ?? 0.2);
    return true;
  }

  if (pending.type === "blink") {
    enemy.actionCooldown = pending.cooldown ?? enemy.actionCooldown;
    enemy.pendingBlinkOffset = pending.offset ?? 0;
    enemy.pendingAction = { ...pending, type: "postBlink" };
    setEnemyState(enemy, "burst", pending.travelTime ?? 0.1);
    return true;
  }

  setEnemyState(enemy, "patrol");
  return false;
}

export function resolveEnemyRecovery(enemy: any): void {
  setEnemyState(enemy, "patrol");
}

// ---------------------------------------------------------------------------
// Watcher height bobbing
// ---------------------------------------------------------------------------

export function updateWatcherHeight(enemy: any, dt: number): void {
  const bob = Math.sin(performance.now() * 0.0045 + enemy.x * 0.012) * 12;
  const targetY = (enemy.baseY ?? enemy.y) + bob;
  enemy.y += (targetY - enemy.y) * Math.min(1, dt * 7.5);
}

// ---------------------------------------------------------------------------
// Boss attack queue helper
// ---------------------------------------------------------------------------

function queueBossAttack(enemy: any, direction: number, attackConfig: any): void {
  enemy.patrolDirection = direction || enemy.patrolDirection || 1;
  beginEnemyWindup(enemy, attackConfig.windup, enemy.patrolDirection, attackConfig.action);
}

// ---------------------------------------------------------------------------
// Per-type behaviour trees
// ---------------------------------------------------------------------------

export function updateEnemyBehavior(enemy: any, dt: number, state: any, services: EnemyAIServices): void {
  if (enemy.type === "watcher") {
    updateWatcherHeight(enemy, dt);
  }

  if (enemy.knockbackTimer > 0 && getEnemyState(enemy) !== "stagger") {
    moveEnemyByVelocity(enemy, dt);
    enemy.vx *= enemy.type === "demon" ? 0.9 : 0.88;
    clampEnemyToPatrol(enemy);
    return;
  }

  if (enemy.state == null) initializeEnemyRuntime(enemy);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const enemyCenterX = enemy.x + enemy.w * 0.5;
  const horizontalDistance = Math.abs(playerCenterX - enemyCenterX);
  const facingToPlayer = Math.sign(playerCenterX - enemyCenterX) || enemy.patrolDirection || 1;
  const elementSpeedMultiplier = getEnemyElementSpeedMultiplier(enemy);

  if (enemy.type === "oracle") {
    updateOracleBehavior(enemy, dt, horizontalDistance, facingToPlayer, elementSpeedMultiplier, state, services);
    return;
  }

  if (enemy.type === "revenant") {
    updateRevenantBehavior(enemy, dt, horizontalDistance, facingToPlayer, elementSpeedMultiplier, state, services);
    return;
  }

  const currentState = getEnemyState(enemy);
  const worldSpeedMultiplier = enemy.worldPhase?.speedMultiplier ?? 1;

  if (currentState === "idle") {
    brakeEnemy(enemy, dt, 1.15);
    if (enemy.stateTimer <= 0) setEnemyState(enemy, "patrol");
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, enemy.type === "demon" ? 1.25 : 1.1);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) {
      beginEnemyRecovery(enemy, enemy.type === "demon" ? 0.16 : 0.1);
    }
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, enemy.type === "demon" ? 1.35 : 1.1);
    if (enemy.stateTimer <= 0) resolveEnemyWindup(enemy);
    return;
  }

  if (currentState === "burst") {
    const pending = enemy.pendingAction;
    if (pending?.type === "burst") {
      accelerateEnemyTowards(enemy, enemy.patrolDirection * pending.speed, dt);
      moveEnemyByVelocity(enemy, dt);
    } else if (pending?.type === "postBlink") {
      const blinkOffset = enemy.pendingBlinkOffset || 0;
      enemy.x = clamp(enemy.x + blinkOffset, enemy.left, enemy.right - enemy.w);
      enemy.pendingBlinkOffset = 0;
      services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.4, "#a9e7ff", 10, 0.85);
      services.applyScreenShake(0.05, 1.5);
      enemy.pendingAction = { type: "burst", speed: pending.speed, recoveryTime: pending.recoveryTime ?? 0.18 };
      accelerateEnemyTowards(enemy, enemy.patrolDirection * pending.speed, dt);
      moveEnemyByVelocity(enemy, dt);
    } else {
      moveEnemyByVelocity(enemy, dt);
    }
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) beginEnemyRecovery(enemy, enemy.pendingAction?.recoveryTime ?? 0.16);
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.05);
    if (enemy.stateTimer <= 0) resolveEnemyRecovery(enemy);
    return;
  }

  // --- patrol ---
  if (currentState === "patrol") {
    if (enemy.type === "hound" && horizontalDistance < 260 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.14, facingToPlayer, { type: "burst", burstTime: 0.24, speed: 335, cooldown: 0.95, recoveryTime: 0.16 });
      return;
    }
    if (enemy.type === "bulwark") {
      enemy.guardFacing = facingToPlayer;
      if (horizontalDistance < 210 && enemy.actionCooldown <= 0) {
        beginEnemyWindup(enemy, 0.32, facingToPlayer, { type: "burst", burstTime: 0.3, speed: 225, cooldown: 1.55, recoveryTime: 0.28 });
        return;
      }
    }
    if (enemy.type === "goblin" && horizontalDistance < 170 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.16, facingToPlayer, { type: "burst", burstTime: 0.22, speed: 255, cooldown: 1.05, recoveryTime: 0.2 });
      return;
    }
    if (enemy.type === "shadowWalker" && horizontalDistance < 210 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.28, facingToPlayer, { type: "burst", burstTime: 0.38, speed: 210, cooldown: 1.8, recoveryTime: 0.18 });
      return;
    }
    if (enemy.type === "demon" && horizontalDistance < 235 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.42, facingToPlayer, { type: "burst", burstTime: 0.54, speed: 285, cooldown: 2.3, recoveryTime: 0.3 });
      return;
    }
    if (enemy.type === "watcher" && horizontalDistance < 250 && enemy.actionCooldown <= 0) {
      beginEnemyWindup(enemy, 0.22, facingToPlayer, {
        type: "blink",
        offset: facingToPlayer * clamp(horizontalDistance * 0.45, 56, 96),
        travelTime: 0.1, burstTime: 0.2, speed: 164, cooldown: 2.1, recoveryTime: 0.24
      });
      return;
    }

    moveEnemyInCurrentDirection(enemy, dt, getEnemyPatrolSpeed(enemy) * elementSpeedMultiplier * worldSpeedMultiplier);
    if (enemy.type === "shadowWalker") tryEnemyPatrolTurn(enemy, 0.18);
    else if (enemy.type === "hound")   tryEnemyPatrolTurn(enemy, 0.08);
    else if (enemy.type === "bulwark") tryEnemyPatrolTurn(enemy, 0.34);
    else if (enemy.type === "demon")   tryEnemyPatrolTurn(enemy, 0.28);
    else                               tryEnemyPatrolTurn(enemy);
  }
}

function updateOracleBehavior(
  enemy: any, dt: number,
  horizontalDistance: number, facingToPlayer: number, elementSpeedMultiplier: number,
  state: any, services: EnemyAIServices
): void {
  const controller = enemy.bossController;
  const currentState = getEnemyState(enemy);
  const phaseResult = resolveBossPhase(enemy, controller);

  if (phaseResult.changed && enemy.awakened) {
    services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.42, "#f7ead1", 18, 0.95);
    services.applyScreenShake(0.12, 4.2);
    services.showMessage(
      phaseResult.phase === "phase-2"
        ? "The Eclipse Lord enters a darker rhythm"
        : "The Eclipse Lord steadies"
    );
  }

  if (currentState === "idle" && !enemy.awakened) {
    enemy.vx = 0;
    if (state.player.x >= controller.introWakeX || horizontalDistance < 280) {
      enemy.awakened = true;
      enemy.patrolDirection = facingToPlayer;
      services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#a8dfff", 22, 1.1);
      services.applyScreenShake(0.14, 4.5);
      queueBossAttack(enemy, facingToPlayer, {
        windup: 0.2,
        action: { type: "blink", offset: facingToPlayer * 120, travelTime: 0.1, burstTime: 0.22, speed: 220, cooldown: 1.45, recoveryTime: 0.22 }
      });
    }
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, 1.08);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) beginEnemyRecovery(enemy, 0.12);
    return;
  }

  if (currentState === "idle" && enemy.awakened) {
    brakeEnemy(enemy, dt, 1.1);
    if (enemy.stateTimer <= 0) setEnemyState(enemy, "patrol");
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, 1.2);
    if (enemy.stateTimer <= 0) resolveEnemyWindup(enemy);
    return;
  }

  if (currentState === "burst") {
    const pending = enemy.pendingAction;
    if (pending?.type === "postBlink") {
      const blinkOffset = enemy.pendingBlinkOffset || 0;
      enemy.x = clamp(enemy.x + blinkOffset, enemy.left, enemy.right - enemy.w);
      enemy.pendingBlinkOffset = 0;
      services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.4, "#9fdfff", 14, 0.8);
      enemy.pendingAction = { type: "burst", speed: pending?.speed ?? 220, recoveryTime: pending?.recoveryTime ?? 0.22 };
    }
    accelerateEnemyTowards(enemy, enemy.patrolDirection * (enemy.pendingAction?.speed ?? 220), dt);
    moveEnemyByVelocity(enemy, dt);
    if (Math.random() < 0.14) {
      services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#a5ddff", 2, 0.25);
    }
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) beginEnemyRecovery(enemy, enemy.pendingAction?.recoveryTime ?? 0.2);
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.08);
    if (enemy.stateTimer <= 0) resolveEnemyRecovery(enemy);
    return;
  }

  if (enemy.actionCooldown <= 0) {
    const ctx = { enemy, phase: controller.phase, horizontalDistance, facingToPlayer, player: state.player };
    const selectedAttack = chooseBossAttack(controller, ctx);
    if (selectedAttack) {
      queueBossAttack(enemy, facingToPlayer, selectedAttack.buildAction(ctx));
      return;
    }
  }

  moveEnemyInCurrentDirection(
    enemy,
    dt,
    controller.phase === "phase-2"
      ? (enemy.baseSpeed + Math.sin(performance.now() * 0.007 + enemy.x * 0.012) * 14) * elementSpeedMultiplier
      : enemy.baseSpeed * elementSpeedMultiplier
  );
  tryEnemyPatrolTurn(enemy);
}

function updateRevenantBehavior(
  enemy: any, dt: number,
  horizontalDistance: number, facingToPlayer: number, elementSpeedMultiplier: number,
  state: any, services: EnemyAIServices
): void {
  const arenaWakeX = 3000;
  const currentState = getEnemyState(enemy);

  if (currentState === "idle" && !enemy.awakened) {
    enemy.vx = 0;
    if (state.player.x >= arenaWakeX || horizontalDistance < 300) {
      enemy.awakened = true;
      enemy.patrolDirection = facingToPlayer;
      services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, "#d4ecff", 22, 1.15);
      services.applyScreenShake(0.14, 4.8);
      beginEnemyWindup(enemy, 0.24, facingToPlayer, { type: "burst", burstTime: 0.28, speed: 310, cooldown: 1.25, recoveryTime: 0.24 });
    }
    return;
  }

  if (currentState === "stagger") {
    moveEnemyByVelocity(enemy, dt);
    brakeEnemy(enemy, dt, 1.08);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0 && enemy.knockbackTimer <= 0) beginEnemyRecovery(enemy, 0.14);
    return;
  }

  if (currentState === "idle" && enemy.awakened) {
    brakeEnemy(enemy, dt, 1.18);
    if (enemy.stateTimer <= 0) setEnemyState(enemy, "patrol");
    return;
  }

  if (currentState === "windup") {
    brakeEnemy(enemy, dt, 1.3);
    if (enemy.stateTimer <= 0) {
      const hadPending = Boolean(enemy.pendingAction);
      resolveEnemyWindup(enemy);
      if (hadPending) services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.46, "#cde8ff", 12, 0.75);
    }
    return;
  }

  if (currentState === "burst") {
    accelerateEnemyTowards(enemy, enemy.patrolDirection * (enemy.pendingAction?.speed ?? 310), dt);
    moveEnemyByVelocity(enemy, dt);
    if (Math.random() < 0.18) services.spawnImpactParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.8, "#cfeeff", 2, 0.22);
    clampEnemyToPatrol(enemy);
    if (enemy.stateTimer <= 0) beginEnemyRecovery(enemy, enemy.pendingAction?.recoveryTime ?? 0.24);
    return;
  }

  if (currentState === "recover") {
    brakeEnemy(enemy, dt, 1.08);
    if (enemy.stateTimer <= 0) resolveEnemyRecovery(enemy);
    return;
  }

  if (horizontalDistance < 380 && enemy.actionCooldown <= 0) {
    beginEnemyWindup(enemy, 0.2, facingToPlayer, { type: "burst", burstTime: 0.28, speed: 310, cooldown: 1.25, recoveryTime: 0.24 });
    return;
  }

  moveEnemyInCurrentDirection(
    enemy,
    dt,
    (enemy.baseSpeed + Math.sin(performance.now() * 0.006 + enemy.x * 0.01) * 12) * elementSpeedMultiplier
  );
  tryEnemyPatrolTurn(enemy);
}
