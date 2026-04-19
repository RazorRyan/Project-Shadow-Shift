import { BossBase } from "./BossBase.js";
import { RUIN_OVERSEER_BOSS_AI } from "../data/enemyAiConfig.js";
import { boxesOverlap } from "../combat/combatResolver.js";

const AI = { INTRO: "intro", STALK: "stalk", SWEEP: "sweep", RECOVER: "recover" };

export class RuinOverseerBoss extends BossBase {
  constructor(scene, x, y, player, statKey = "ruin_overseer") {
    super(scene, x, y, statKey, RUIN_OVERSEER_BOSS_AI.phases);
    this.player = player;
    this.aiState = AI.INTRO;
    this.stateTimer = RUIN_OVERSEER_BOSS_AI.introMs;
    this._attackConnected = false;
    this._sweepPhase = "telegraph";
    this._setState(AI.INTRO);
  }

  _setState(state) {
    const cfg = RUIN_OVERSEER_BOSS_AI;
    const phase = this.getCurrentPhaseConfig() ?? cfg.phases[0];
    this.aiState = state;

    if (state === AI.INTRO) {
      this.stateTimer = cfg.introMs;
      this.sprite.body.setVelocityX(0);
      this.sprite.setTint(phase.tint);
      this.clearAlert();
    }

    if (state === AI.STALK) {
      this.stateTimer = phase.stalkMs;
      this._attackConnected = false;
      this.sprite.setTint(phase.tint);
      this.clearAlert();
    }

    if (state === AI.SWEEP) {
      this.stateTimer = phase.telegraphMs ?? 160;
      this._attackConnected = false;
      this._sweepPhase = "telegraph";
      this.sprite.setVelocityX(0);
      this.sprite.setTint(phase.attackTint);
      this.setAlert("!", "#ffd7a1");
    }

    if (state === AI.RECOVER) {
      this.stateTimer = phase.recoverMs;
      this.sprite.body.setVelocityX(0);
      this.sprite.setTint(phase.recoverTint);
      this.clearAlert();
    }
  }

  onUpdate(delta) {
    if (!this.isAlive()) {
      this.sprite.body.setVelocityX(0);
      return;
    }

    const phase = this.getCurrentPhaseConfig() ?? RUIN_OVERSEER_BOSS_AI.phases[0];
    const playerDir = this.player.sprite.x >= this.sprite.x ? 1 : -1;
    this.setFacing(playerDir);

    switch (this.aiState) {
      case AI.INTRO:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this._setState(AI.STALK);
        }
        break;

      case AI.STALK:
        this.stateTimer -= delta;
        this.sprite.body.setVelocityX(this.facing * phase.stalkSpeed);
        if (this.stateTimer <= 0 || Math.abs(this.player.sprite.x - this.sprite.x) <= phase.sweepTriggerRange) {
          this._setState(AI.SWEEP);
        }
        break;

      case AI.SWEEP: {
        this.stateTimer -= delta;
        if (this._sweepPhase === "telegraph") {
          this.sprite.body.setVelocityX(0);
          if (this.stateTimer <= 0) {
            this._sweepPhase = "strike";
            this.stateTimer = phase.sweepMs;
            this.sprite.body.setVelocityX(this.facing * phase.sweepSpeed);
            this.setAlert("!!!", "#ffb36b");
          }
          break;
        }

        this.sprite.body.setVelocityX(this.facing * phase.sweepSpeed);
        if (!this._attackConnected) {
          const hb = this.getHurtbox();
          const atkBox = {
            x: this.facing > 0 ? hb.x : hb.x - phase.attackWidth,
            y: hb.y - 6,
            w: hb.w + phase.attackWidth,
            h: hb.h + 12,
          };
          const pb = this.player.sprite.body;
          const playerBox = { x: pb.x, y: pb.y, w: pb.width, h: pb.height };
          if (boxesOverlap(atkBox, playerBox) && !this.player.isInvulnerable()) {
            this.player.applyDamage({ damage: phase.attackDamage, sourceX: this.sprite.x });
            this._attackConnected = true;
          }
        }
        if (this.stateTimer <= 0) {
          this._setState(AI.RECOVER);
        }
        break;
      }

      case AI.RECOVER:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this._setState(AI.STALK);
        }
        break;
    }
  }

  onHurt(_hit) {
    if (this.aiState === AI.STALK) {
      this.stateTimer = Math.min(this.stateTimer, 240);
    }
  }

  onPhaseChanged(phaseConfig) {
    this.scene.cameras.main.shake(180, 0.004);
    this.scene.audio?.onBossPhase?.();
    this._setState(AI.INTRO);
    this.stateTimer = phaseConfig?.introMs ?? 600;
  }

  onDefeat(_hit) {
    this.sprite.body.setVelocity(0, 0);
    this.nameText.setTint(0xffd48c);
    this.clearAlert();
  }

  onRevive() {
    this._setState(AI.INTRO);
  }
}
