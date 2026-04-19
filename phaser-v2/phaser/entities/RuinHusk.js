import { EnemyBase } from "./EnemyBase.js";
import { RUIN_HUSK_AI } from "../data/enemyAiConfig.js";
import { boxesOverlap } from "../combat/combatResolver.js";

const AI = { IDLE: "idle", PATROL: "patrol", CHASE: "chase", ATTACK: "attack", RECOVER: "recover" };

export class RuinHusk extends EnemyBase {
  constructor(scene, x, y, player) {
    super(scene, x, y, "ruin_husk");
    this.player = player;
    this.spawnX = x;
    this.aiState = AI.IDLE;
    this.stateTimer = RUIN_HUSK_AI.idleMs;
    this.patrolDir = 1;
    this._attackPhase = "telegraph";
    this._attackTimer = 0;
    this._hitPlayerThisLunge = false;
  }

  _dist() {
    return Math.abs(this.sprite.x - this.player.sprite.x);
  }

  _inRange(r) {
    return this.isAlive() && this._dist() <= r;
  }

  _facePlayer() {
    this.facing = this.player.sprite.x >= this.sprite.x ? 1 : -1;
    this.sprite.setFlipX(this.facing < 0);
  }

  _setState(state) {
    const cfg = RUIN_HUSK_AI;
    this.aiState = state;
    if (state === AI.IDLE)    { this.stateTimer = cfg.idleMs; this.sprite.body.setVelocityX(0); }
    if (state === AI.PATROL)  { this.stateTimer = cfg.patrolDurationMs; }
    if (state === AI.RECOVER) { this.stateTimer = cfg.recoverMs; this.sprite.body.setVelocityX(0); }
    if (state === AI.ATTACK)  {
      this._attackPhase = "telegraph";
      this._attackTimer = cfg.attackTelegraphMs;
      this._hitPlayerThisLunge = false;
      this.sprite.body.setVelocityX(0);
    }
  }

  onUpdate(delta) {
    if (!this.isAlive()) {
      this.sprite.body.setVelocityX(0);
      return;
    }

    const cfg = RUIN_HUSK_AI;

    switch (this.aiState) {
      case AI.IDLE: {
        this.stateTimer -= delta;
        if (this._inRange(cfg.detectionRange)) { this._setState(AI.CHASE); break; }
        if (this.stateTimer <= 0) { this._setState(AI.PATROL); }
        break;
      }

      case AI.PATROL: {
        this.stateTimer -= delta;
        const offset = this.sprite.x - this.spawnX;
        if (offset > cfg.patrolRadius || this.sprite.body.blocked.right) this.patrolDir = -1;
        if (offset < -cfg.patrolRadius || this.sprite.body.blocked.left)  this.patrolDir = 1;
        this.facing = this.patrolDir;
        this.sprite.setFlipX(this.facing < 0);
        this.sprite.body.setVelocityX(this.patrolDir * cfg.patrolSpeed);
        if (this._inRange(cfg.detectionRange)) { this._setState(AI.CHASE); break; }
        if (this.stateTimer <= 0) { this._setState(AI.IDLE); }
        break;
      }

      case AI.CHASE: {
        if (!this._inRange(cfg.loseRange)) { this._setState(AI.PATROL); break; }
        if (this._inRange(cfg.attackRange)) { this._facePlayer(); this._setState(AI.ATTACK); break; }
        this._facePlayer();
        this.sprite.body.setVelocityX(this.facing * cfg.chaseSpeed);
        break;
      }

      case AI.ATTACK: {
        this._attackTimer -= delta;
        if (this._attackPhase === "telegraph") {
          this.sprite.setTint(0xff5530);
          if (this._attackTimer <= 0) {
            this._attackPhase = "lunge";
            this._attackTimer = cfg.attackLungeMs;
            this.sprite.body.setVelocityX(this.facing * cfg.attackLungeSpeed);
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
              this.player.applyDamage({ damage: cfg.attackDamage, sourceX: this.sprite.x });
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
          this._setState(this._inRange(cfg.loseRange) ? AI.CHASE : AI.PATROL);
        }
        break;
      }
    }

    // Debug: show AI state in name label
    if (this.isAlive()) {
      this.nameText.setText(`${this.label} ${this.hp}/${this.maxHp} [${this.aiState}]`);
    }
  }

  onHurt(_hit) {
    // Getting hit interrupts attack and triggers aggro
    if (this.aiState === AI.ATTACK) { this._setState(AI.RECOVER); return; }
    if (this.aiState === AI.IDLE || this.aiState === AI.PATROL) { this._setState(AI.CHASE); }
  }

  onDefeat(_hit) {
    this.sprite.body.setVelocityX(0);
  }
}
