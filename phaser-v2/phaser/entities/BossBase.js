import { EnemyBase } from "./EnemyBase.js";

export class BossBase extends EnemyBase {
  constructor(scene, x, y, statKey, phaseThresholds = []) {
    super(scene, x, y, statKey);
    this.phaseThresholds = [...phaseThresholds].sort((a, b) => b.hpRatio - a.hpRatio);
    this.phaseIndex = 0;
  }

  getCurrentPhaseConfig() {
    return this.phaseThresholds[this.phaseIndex] ?? null;
  }

  getCurrentHpRatio() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  applyHit(hit) {
    const result = super.applyHit(hit);
    if (!result || result.defeated) {
      return result;
    }

    const nextPhaseIndex = this.phaseThresholds.findIndex(
      (phase, index) => index > this.phaseIndex && this.getCurrentHpRatio() <= phase.hpRatio
    );

    if (nextPhaseIndex >= 0) {
      this.phaseIndex = nextPhaseIndex;
      this.onPhaseChanged(this.getCurrentPhaseConfig(), hit);
    }

    return result;
  }

  resetCombatState() {
    super.resetCombatState();
    this.phaseIndex = 0;
  }

  getDisplayName() {
    const phaseNumber = this.phaseIndex + 1;
    return this.isAlive()
      ? `${this.label} ${this.hp}/${this.maxHp} [P${phaseNumber}]`
      : `${this.label} defeated`;
  }

  // eslint-disable-next-line no-unused-vars
  onPhaseChanged(_phaseConfig, _hit) {}
}
