import { PLAYER_MOVEMENT_CONFIG } from "../config/playerMovementConfig.js";
import { PLAYER_COMBAT_CONFIG } from "../config/playerCombatConfig.js";
import { canQueueComboAttack, getAttackProfile } from "../combat/playerAttackProfiles.js";
import { applyDamageToPlayer, createPlayerState, resetPlayerState, tickPlayerState } from "../components/playerState.js";
import { createPlayerPresentationDriver } from "../systems/playerPresentationDriver.js";

function approachValue(current, target, delta) {
  if (current < target) {
    return Math.min(current + delta, target);
  }
  if (current > target) {
    return Math.max(current - delta, target);
  }
  return target;
}

function resolveHorizontalVelocity(player, moveAxis, deltaSeconds) {
  if (player.wallJumpLock > 0) {
    return player.sprite.body.velocity.x;
  }

  const config = player.config;
  let targetSpeed = moveAxis * config.moveSpeed;
  const accelerating = moveAxis !== 0;
  const grounded = player.isGrounded();
  const currentVelocity = player.sprite.body.velocity.x;
  const reversing = Math.sign(currentVelocity) !== 0 && Math.sign(targetSpeed) !== 0 && Math.sign(currentVelocity) !== Math.sign(targetSpeed);
  const baseRate = grounded
    ? (accelerating ? config.groundAcceleration : config.groundDeceleration)
    : (accelerating ? config.airAcceleration : config.airDeceleration);
  const landingBoost = grounded && player.landingRecoveryTimer > 0
    ? config.landingTractionMultiplier
    : 1;
  const rate = (reversing ? baseRate * config.turnAccelerationMultiplier : baseRate) * landingBoost;

  return approachValue(currentVelocity, targetSpeed, rate * deltaSeconds);
}

export class PlayerController {
  constructor(scene, x, y, input) {
    this.scene = scene;
    this.input = input;
    this.config = PLAYER_MOVEMENT_CONFIG;
    this.state = createPlayerState();
    this.facing = 1;
    this.moveAxis = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLock = 0;
    this.wallJumpGraceTimer = 0;
    this.wallDirection = 0;
    this.lastWallDirection = 0;
    this.wallSliding = false;
    this.jumpReleased = false;
    this.jumpCutReady = false;
    this.wasGrounded = false;
    this.airborneFallSpeed = 0;
    this.landingRecoveryTimer = 0;
    this.pendingLandingImpact = null;
    this.isDashing = false;
    this.attackBufferTimer = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackRecover = 0;
    this.attackType = "normal";
    this.attackProfileId = null;
    this.comboStep = -1;
    this.comboChainTimer = 0;
    this.queuedAttack = false;
    this.activeAttackProfile = null;
    this.attackTargetIds = new Set();
    this.canDoubleJump = false;
    this.airJumpsUsed = 0;

    this.sprite = scene.physics.add.sprite(x, y, "player-block");
    this.sprite.setDisplaySize(this.config.width, this.config.height);
    this.sprite.setSize(this.config.width, this.config.height);
    this.sprite.setOffset(0, 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setGravityY(this.config.gravity);
    this.sprite.body.setMaxVelocity(this.config.dashSpeed, this.config.terminalFallSpeed);
    this.presentation = createPlayerPresentationDriver(this);
  }

  isGrounded() {
    return this.sprite.body.blocked.down;
  }

  isOnWall() {
    return !this.isGrounded() && (this.sprite.body.blocked.left || this.sprite.body.blocked.right);
  }

  isDead() {
    return this.state.dead;
  }

  isInvulnerable() {
    return this.state.invulnerabilityTimer > 0;
  }

  getHealth() {
    return this.state.hp;
  }

  getMaxHealth() {
    return this.state.maxHp;
  }

  startDash() {
    if (this.isDead() || this.dashCooldown > 0 || this.dashTimer > 0 || this.attackTimer > 0) {
      return;
    }

    this.dashTimer = this.config.dashDurationMs;
    this.dashCooldown = this.config.dashCooldownDurationMs;
    this.isDashing = true;
    this.wallSliding = false;
    this.wallJumpGraceTimer = 0;
    this.jumpCutReady = false;
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setVelocity(this.facing * this.config.dashSpeed, 0);
  }

  resetTo(x, y) {
    this.sprite.setPosition(x, y);
    this.sprite.body.setVelocity(0, 0);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setGravityY(this.config.gravity);
    this.sprite.setAlpha(1);
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLock = 0;
    this.wallJumpGraceTimer = 0;
    this.wallDirection = 0;
    this.lastWallDirection = 0;
    this.wallSliding = false;
    this.jumpReleased = false;
    this.jumpCutReady = false;
    this.wasGrounded = false;
    this.airborneFallSpeed = 0;
    this.landingRecoveryTimer = 0;
    this.pendingLandingImpact = null;
    this.isDashing = false;
    this.attackBufferTimer = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackRecover = 0;
    this.attackType = "normal";
    this.attackProfileId = null;
    this.comboStep = -1;
    this.comboChainTimer = 0;
    this.queuedAttack = false;
    this.activeAttackProfile = null;
    this.attackTargetIds.clear();
    this.airJumpsUsed = 0;
    resetPlayerState(this.state);
    this.presentation.update(0);
  }

  getVerticalAim() {
    return this.input.isDown("aimDown") ? 1 : 0;
  }

  canStartAttack() {
    return !this.isDead() && this.dashTimer <= 0;
  }

  applyDamage({ damage = 1, sourceX = this.sprite.x } = {}) {
    const result = applyDamageToPlayer(this.state, damage);
    if (!result) {
      return null;
    }

    this.attackTimer = 0;
    this.attackCooldown = Math.max(this.attackCooldown, result.defeated ? 0 : 120);
    this.activeAttackProfile = null;
    this.queuedAttack = false;
    this.dashTimer = 0;
    this.isDashing = false;
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setGravityY(this.config.gravity);

    if (result.defeated) {
      this.sprite.body.setVelocity(0, 0);
      this.sprite.setAlpha(0.4);
      return result;
    }

    const direction = Math.sign(this.sprite.x - sourceX) || this.facing || 1;
    this.sprite.body.setVelocity(direction * 180, -180);
    return result;
  }

  consumeRespawnRequest() {
    if (!this.state.pendingRespawn) {
      return false;
    }

    this.state.pendingRespawn = false;
    return true;
  }

  commitAttackProfile(profile) {
    const body = this.sprite.body;
    this.attackType = profile.type;
    this.attackProfileId = profile.id;
    this.attackCooldown = profile.cooldownMs;
    this.attackTimer = profile.attackTimeMs;
    this.attackRecover = profile.recoverMs;
    this.comboChainTimer = profile.comboWindowMs;
    this.comboStep = profile.type === "combo" ? profile.comboIndex : -1;
    this.queuedAttack = false;
    this.activeAttackProfile = profile;
    this.attackTargetIds.clear();
    body.setVelocityX(body.velocity.x + this.facing * profile.forwardBoost);
  }

  tryAttack(mode = "auto") {
    if (!this.canStartAttack()) {
      return false;
    }

    if (this.attackCooldown > 0) {
      if (mode === "auto" && canQueueComboAttack(this)) {
        this.queuedAttack = true;
      }
      return false;
    }

    const profile = getAttackProfile(this, mode);
    this.commitAttackProfile(profile);
    return true;
  }

  getActiveAttackProfile() {
    return this.attackTimer > 0 ? this.activeAttackProfile : null;
  }

  hasHitTarget(targetId) {
    return this.attackTargetIds.has(targetId);
  }

  registerAttackHit(targetId) {
    this.attackTargetIds.add(targetId);
  }

  consumeLandingImpact() {
    const impact = this.pendingLandingImpact;
    this.pendingLandingImpact = null;
    return impact;
  }

  update(delta) {
    const deltaSeconds = delta / 1000;
    const body = this.sprite.body;

    tickPlayerState(this.state, delta);

    this.dashTimer = Math.max(0, this.dashTimer - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.attackBufferTimer = Math.max(0, this.attackBufferTimer - delta);
    this.attackTimer = Math.max(0, this.attackTimer - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.attackRecover = Math.max(0, this.attackRecover - delta);
    this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
    this.wallJumpLock = Math.max(0, this.wallJumpLock - delta);
    this.wallJumpGraceTimer = Math.max(0, this.wallJumpGraceTimer - delta);
    this.comboChainTimer = Math.max(0, this.comboChainTimer - delta);
    this.landingRecoveryTimer = Math.max(0, this.landingRecoveryTimer - delta);

    if (this.isDead()) {
      body.setAllowGravity(false);
      body.setVelocity(0, 0);
      this.sprite.setAlpha(0.4);
      this.presentation.update(delta);
      return;
    }

    const startedGrounded = this.isGrounded();

    const moveAxis = this.input.getAxis("moveLeft", "moveRight");
    this.moveAxis = moveAxis;
    if (moveAxis !== 0) {
      this.facing = moveAxis;
    }

    if (this.input.wasPressed("jump")) {
      this.jumpBufferTimer = this.config.jumpBufferMs;
    }
    if (this.input.wasReleased("jump")) {
      this.jumpReleased = true;
    }
    if (this.input.wasPressed("dash")) {
      this.startDash();
    }
    if (this.input.wasPressed("attack")) {
      this.attackBufferTimer = PLAYER_COMBAT_CONFIG.attackKeyBufferMs;
    }

    if (startedGrounded) {
      this.coyoteTimer = this.config.coyoteTimeMs;
      this.wallSliding = false;
      this.jumpCutReady = false;
      this.airborneFallSpeed = 0;
      this.airJumpsUsed = 0;
    } else {
      this.airborneFallSpeed = Math.max(this.airborneFallSpeed, body.velocity.y);
    }

    if (this.isOnWall()) {
      this.wallDirection = body.blocked.left ? -1 : 1;
      this.lastWallDirection = this.wallDirection;
      this.wallJumpGraceTimer = this.config.wallJumpGraceTimeMs;
    } else if (this.wallJumpGraceTimer <= 0) {
      this.wallDirection = 0;
    }

    this.wallSliding = this.isOnWall()
      && this.wallJumpLock <= 0
      && this.dashTimer <= 0
      && body.velocity.y >= this.config.wallSlideEntrySpeed;

    if (this.dashTimer > 0) {
      body.setAllowGravity(false);
      body.setVelocity(this.facing * this.config.dashSpeed, 0);
    } else {
      if (this.isDashing) {
        body.setVelocityX(body.velocity.x * this.config.dashEndMomentumMultiplier);
        this.isDashing = false;
      }

      body.setAllowGravity(true);
      body.setGravityY(this.getCurrentGravity());
      body.setVelocityX(resolveHorizontalVelocity(this, moveAxis, deltaSeconds));
      body.setVelocityY(Math.min(body.velocity.y, this.config.terminalFallSpeed));
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-this.config.jumpForce);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCutReady = true;
      this.wallSliding = false;
      this.airJumpsUsed = 0;
    } else if (this.jumpBufferTimer > 0 && this.wallJumpGraceTimer > 0 && this.lastWallDirection !== 0) {
      body.setVelocityX(-this.lastWallDirection * this.config.wallJumpHorizontalSpeed);
      body.setVelocityY(-this.config.jumpForce * this.config.wallJumpVerticalMultiplier);
      this.jumpBufferTimer = 0;
      this.wallJumpLock = this.config.wallJumpLockDurationMs;
      this.wallJumpGraceTimer = 0;
      this.wallSliding = false;
      this.jumpCutReady = true;
      this.airJumpsUsed = 0;
    } else if (this.jumpBufferTimer > 0 && this.canDoubleJump && this.airJumpsUsed < 1 && !this.isGrounded() && this.dashTimer <= 0) {
      body.setVelocityY(-this.config.jumpForce * 0.86);
      this.jumpBufferTimer = 0;
      this.airJumpsUsed = 1;
      this.jumpCutReady = true;
    }

    if (this.wallSliding) {
      body.setVelocityY(Math.min(body.velocity.y, this.config.wallSlideSpeed));
    }

    if (this.jumpReleased && this.jumpCutReady && body.velocity.y < -this.config.jumpCutVelocityGate) {
      body.setVelocityY(body.velocity.y * this.config.jumpCutMultiplier);
      this.jumpCutReady = false;
    }

    if (this.attackBufferTimer > 0 && this.tryAttack()) {
      this.attackBufferTimer = 0;
    }

    if (this.queuedAttack && this.attackCooldown <= 0) {
      this.tryAttack("queued");
    }

    if (this.attackTimer <= 0) {
      this.activeAttackProfile = null;
    }

    if (this.comboChainTimer <= 0 && this.attackCooldown <= 0) {
      this.comboStep = -1;
    }

    const endedGrounded = this.isGrounded();
    if (endedGrounded && !this.wasGrounded && this.airborneFallSpeed >= this.config.landingRecoveryFallThreshold) {
      this.pendingLandingImpact = {
        x: this.sprite.x,
        y: body.bottom,
        fallSpeed: this.airborneFallSpeed
      };
      this.landingRecoveryTimer = this.config.landingRecoveryMs;
      this.airborneFallSpeed = 0;
    }

    this.presentation.update(delta);
    if (this.state.hurtTimer > 0) {
      this.sprite.setAlpha(this.state.invulnerabilityTimer > 0 && Math.floor(this.state.invulnerabilityTimer / 70) % 2 === 0 ? 0.45 : 0.72);
    } else {
      this.sprite.setAlpha(1);
    }
    this.wasGrounded = endedGrounded;
    this.jumpReleased = false;
  }

  getCurrentGravity() {
    const velocityY = this.sprite.body.velocity.y;
    if (this.isGrounded()) {
      return this.config.gravity;
    }
    if (velocityY < -this.config.apexVelocityWindow) {
      return this.config.gravity * this.config.riseGravityMultiplier;
    }
    if (Math.abs(velocityY) <= this.config.apexVelocityWindow) {
      return this.config.gravity * this.config.apexGravityMultiplier;
    }
    return this.config.gravity * this.config.fallGravityMultiplier;
  }
}
