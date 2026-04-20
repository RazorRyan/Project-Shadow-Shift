(function initializeShadowShiftMovement(global) {
  const BASE_MOVEMENT_TUNING = {
    moveSpeed: 320,
    groundAcceleration: 3200,
    groundDeceleration: 3600,
    airAcceleration: 1850,
    airDeceleration: 1320,
    turnAccelerationMultiplier: 1.2,
    attackRecoverBoost: 85,
    jumpForce: 760,
    coyoteTime: 0.12,
    jumpBufferTime: 0.16,
    jumpCutVelocityGate: 120,
    jumpCutMultiplier: 0.48,
    riseGravityMultiplier: 0.92,
    apexGravityMultiplier: 0.72,
    apexVelocityWindow: 85,
    fallGravityMultiplier: 1.55,
    terminalFallSpeed: 980,
    wallSlideEntrySpeed: 45,
    wallSlideSpeed: 170,
    wallJumpGraceTime: 0.08,
    wallJumpLockDuration: 0.12,
    wallJumpHorizontalSpeed: 360,
    wallJumpVerticalMultiplier: 0.96,
    dashSpeed: 760,
    dashDuration: 0.14,
    dashCooldownDuration: 0.35,
    dashEndMomentumMultiplier: 0.58,
    pogoBounceStrength: 590,
    pogoHazardGraceTime: 0.12,
    pogoEnemyBounceBonus: 1,
    pogoHazardBounceMultiplier: 0.92,
    pogoBarrierBounceMultiplier: 0.96
  };

  function getMovementTuning(state, player) {
    const tuning = {
      ...BASE_MOVEMENT_TUNING
    };

    if (state.element === "Wind") {
      tuning.moveSpeed *= 1.18;
      tuning.jumpForce *= 1.08;
      tuning.riseGravityMultiplier *= 0.9;
      tuning.apexGravityMultiplier *= 0.88;
      tuning.fallGravityMultiplier *= 0.84;
      tuning.terminalFallSpeed *= 0.92;
    }

    if (player.moveSpeed != null) {
      tuning.moveSpeed = player.moveSpeed;
    }
    if (player.jumpForce != null) {
      tuning.jumpForce = player.jumpForce;
    }
    if (player.dashSpeed != null) {
      tuning.dashSpeed = player.dashSpeed;
    }
    if (player.dashDuration != null) {
      tuning.dashDuration = player.dashDuration;
    }
    if (player.dashCooldownDuration != null) {
      tuning.dashCooldownDuration = player.dashCooldownDuration;
    }
    if (player.wallSlideSpeed != null) {
      tuning.wallSlideSpeed = player.wallSlideSpeed;
    }
    if (player.jumpCutMultiplier != null) {
      tuning.jumpCutMultiplier = player.jumpCutMultiplier;
    }

    return tuning;
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

  function resolveHorizontalVelocity(player, movement, moveAxis, dt) {
    if (player.wallJumpLock > 0) {
      return player.vx;
    }

    let targetSpeed = moveAxis * movement.moveSpeed;
    if (player.attackRecover > 0) {
      targetSpeed += player.facing * movement.attackRecoverBoost;
    }

    const grounded = player.onGround;
    const accelerating = moveAxis !== 0;
    const reversing = Math.sign(player.vx) !== 0 && Math.sign(targetSpeed) !== 0 && Math.sign(player.vx) !== Math.sign(targetSpeed);
    const baseRate = grounded
      ? accelerating ? movement.groundAcceleration : movement.groundDeceleration
      : accelerating ? movement.airAcceleration : movement.airDeceleration;
    const rate = reversing ? baseRate * movement.turnAccelerationMultiplier : baseRate;

    return approachValue(player.vx, targetSpeed, rate * dt);
  }

  global.ShadowShiftMovement = {
    BASE_MOVEMENT_TUNING,
    getMovementTuning,
    resolveHorizontalVelocity
  };
})(window);
