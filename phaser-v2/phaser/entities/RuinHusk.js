import { EnemyBase } from "./EnemyBase.js";
import { RUIN_HUSK_AI } from "../data/enemyAiConfig.js";
import { boxesOverlap } from "../combat/combatResolver.js";
import { SHADOW_SWAP_PHASES } from "../data/shadowSwapConfig.js";

const AI = { IDLE: "idle", PATROL: "patrol", CHASE: "chase", ATTACK: "attack", RECOVER: "recover" };

export class RuinHusk extends EnemyBase {
  constructor(scene, x, y, player, statKey = "ruin_husk") {
    super(scene, x, y, statKey);
    this.player = player;
    this.spawnX = x;
    this.worldPhase = SHADOW_SWAP_PHASES.LIGHT;
    this.aiState = AI.IDLE;
    this.stateTimer = RUIN_HUSK_AI.idleMs;
    this.patrolDir = 1;
    this._attackPhase = "telegraph";
    this._attackTimer = 0;
    this._hitPlayerThisLunge = false;
    this._setState(AI.IDLE);
  }

  _dist() {
    return Math.abs(this.sprite.x - this.player.sprite.x);
  }

  _inRange(r) {
    return this.isAlive() && this._dist() <= r;
  }

  _facePlayer() {
    this.setFacing(this.player.sprite.x >= this.sprite.x ? 1 : -1);
  }

  _setState(state) {
    const cfg = RUIN_HUSK_AI;
    const phaseCfg = cfg.phaseModifiers[this.worldPhase] ?? cfg.phaseModifiers.light;
    this.aiState = state;
    this.clearAlert();
    if (state === AI.IDLE)    { this.stateTimer = cfg.idleMs; this.sprite.body.setVelocityX(0); this.sprite.setTint(cfg.stateTints.idle); }
    if (state === AI.PATROL)  { this.stateTimer = cfg.patrolDurationMs; this.sprite.setTint(cfg.stateTints.patrol); }
    if (state === AI.CHASE)   { this.sprite.setTint(cfg.stateTints.chase); }
    if (state === AI.RECOVER) { this.stateTimer = cfg.recoverMs; this.sprite.body.setVelocityX(0); this.sprite.setTint(cfg.stateTints.recover); }
    if (state === AI.ATTACK)  {
      this._attackPhase = "telegraph";
      this._attackTimer = cfg.attackTelegraphMs;
      this._hitPlayerThisLunge = false;
      this.sprite.body.setVelocityX(0);
      this.sprite.setTint(cfg.stateTints.attackTelegraph ^ (this.worldPhase === SHADOW_SWAP_PHASES.SHADOW ? 0x221144 : 0x000000));
      this.setAlert("!", this.worldPhase === SHADOW_SWAP_PHASES.SHADOW ? "#d6b8ff" : "#ffd58a");
    }
  }

  onUpdate(delta) {
    if (!this.isAlive()) {
      this.sprite.body.setVelocityX(0);
      return;
    }

    const cfg = RUIN_HUSK_AI;
    const phaseCfg = cfg.phaseModifiers[this.worldPhase] ?? cfg.phaseModifiers.light;
    const detectionRange = cfg.detectionRange * phaseCfg.detectionRangeMultiplier;
    const loseRange = cfg.loseRange * phaseCfg.detectionRangeMultiplier;
    const attackRange = cfg.attackRange * phaseCfg.attackRangeMultiplier;

    switch (this.aiState) {
      case AI.IDLE: {
        this.stateTimer -= delta;
        if (this._inRange(detectionRange)) { this._setState(AI.CHASE); break; }
        if (this.stateTimer <= 0) { this._setState(AI.PATROL); }
        break;
      }

      case AI.PATROL: {
        this.stateTimer -= delta;
        const offset = this.sprite.x - this.spawnX;
        if (offset > cfg.patrolRadius || this.sprite.body.blocked.right) this.patrolDir = -1;
        if (offset < -cfg.patrolRadius || this.sprite.body.blocked.left)  this.patrolDir = 1;
        this.setFacing(this.patrolDir);
        this.sprite.body.setVelocityX(this.patrolDir * cfg.patrolSpeed * phaseCfg.patrolSpeedMultiplier);
        if (this._inRange(detectionRange)) { this._setState(AI.CHASE); break; }
        if (this.stateTimer <= 0) { this._setState(AI.IDLE); }
        break;
      }

      case AI.CHASE: {
        if (!this._inRange(loseRange)) { this._setState(AI.PATROL); break; }
        if (this._inRange(attackRange)) { this._facePlayer(); this._setState(AI.ATTACK); break; }
        this._facePlayer();
        this.sprite.body.setVelocityX(this.facing * cfg.chaseSpeed * phaseCfg.chaseSpeedMultiplier);
        break;
      }

      case AI.ATTACK: {
        this._attackTimer -= delta;
        if (this._attackPhase === "telegraph") {
          if (this._attackTimer <= 0) {
            this._attackPhase = "lunge";
            this._attackTimer = cfg.attackLungeMs;
            this.sprite.body.setVelocityX(this.facing * cfg.attackLungeSpeed * phaseCfg.attackLungeSpeedMultiplier);
            this.sprite.setTint(cfg.stateTints.attackLunge);
            this.setAlert("!!", this.worldPhase === SHADOW_SWAP_PHASES.SHADOW ? "#ff9ef6" : "#ffb36b");
          }
        } else {
          // Check overlap with player during lunge (once per lunge)
          if (!this._hitPlayerThisLunge) {
            const hb = this.getHurtbox();
            const atkW = this.stats.width * 1.4;
            const atkBox = {
              x: this.facing > 0 ? hb.x : hb.x - (atkW - hb.w),
              y: hb.y, w: atkW, h: hb.h,
            };
            const pb = this.player.sprite.body;
            const playerBox = { x: pb.x, y: pb.y, w: pb.width, h: pb.height };
            if (boxesOverlap(atkBox, playerBox) && !this.player.isInvulnerable()) {
              this.player.applyDamage({ damage: cfg.attackDamage + phaseCfg.attackDamageBonus, sourceX: this.sprite.x });
              this._hitPlayerThisLunge = true;
            }
          }
          if (this._attackTimer <= 0) {
            this.sprite.body.setVelocityX(0);
            this._setState(AI.RECOVER);
          }
        }
        break;
      }

      case AI.RECOVER: {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this._setState(this._inRange(loseRange) ? AI.CHASE : AI.PATROL);
        }
        break;
      }
    }

    // Debug: show AI state in name label
  }

  getDisplayName() {
    const phaseCfg = RUIN_HUSK_AI.phaseModifiers[this.worldPhase] ?? RUIN_HUSK_AI.phaseModifiers.light;
    return this.isAlive()
      ? `${this.label}${phaseCfg.nameSuffix} ${this.hp}/${this.maxHp} [${this.aiState}]`
      : `${this.label} defeated`;
  }

  onHurt(_hit) {
    // Getting hit interrupts attack and triggers aggro
    if (this.aiState === AI.ATTACK) { this._setState(AI.RECOVER); return; }
    if (this.aiState === AI.IDLE || this.aiState === AI.PATROL) { this._setState(AI.CHASE); }
  }

  onDefeat(_hit) {
    this.sprite.body.setVelocityX(0);
  }

  onRevive() {
    this.patrolDir = 1;
    this._setState(AI.IDLE);
  }

  onWorldPhaseChanged(phase) {
    this.worldPhase = phase;
    const tint = RUIN_HUSK_AI.phaseTints[phase] ?? 0xffffff;
    this.nameText.setTint(tint);
    if (this.isAlive()) {
      this._setState(this.aiState);
    }
  }
}
