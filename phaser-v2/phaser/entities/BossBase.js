import { EnemyBase } from "./EnemyBase.js";
import { BOSS_DATA } from "../data/bossData.js";

/**
 * BossBase — extends EnemyBase with phase-transition support.
 *
 * Phase thresholds are HP fractions (e.g. 0.6 = 60% HP).
 * When HP crosses a threshold, onPhaseChange(phaseIndex, phaseName) fires once.
 *
 * Subclasses should override onPhaseChange() to react.
 */
export class BossBase extends EnemyBase {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x
   * @param {number}       y
   * @param {string}       bossKey  — key in BOSS_DATA
   */
  constructor(scene, x, y, bossKey) {
    const bossConfig = BOSS_DATA[bossKey];
    super(scene, x, y, bossConfig.statKey);

    this.bossConfig     = bossConfig;
    this.phaseIndex     = 0;
    this._nextThreshold = 0;            // index into phaseThresholds already fired
    this._phaseListeners = [];

    // Boss HP bar — shown above sprite
    this._buildHpBar();
  }

  // ── HP bar ──────────────────────────────────────────────────────────────────

  _buildHpBar() {
    const bx = this.sprite.x - 64;
    const by = this.sprite.y - this.stats.height * 0.5 - 28;
    this._hpBarBg = this.scene.add.rectangle(bx + 64, by, 128, 10, 0x222222).setDepth(8);
    this._hpBarFill = this.scene.add.rectangle(bx, by, 128, 10, 0xcc3333).setOrigin(0, 0.5).setDepth(9);
    this._hpLabel = this.scene.add.text(bx + 64, by - 12, this.stats.label, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#ffaaaa",
    }).setOrigin(0.5, 1).setDepth(9);
  }

  _syncHpBar() {
    const frac = Math.max(0, this.hp / this.maxHp);
    this._hpBarFill.width = Math.round(128 * frac);
    this._hpBarFill.x = this.sprite.x - 64;
    this._hpBarBg.x   = this.sprite.x;
    this._hpBarBg.y   = this.sprite.y - this.stats.height * 0.5 - 28;
    this._hpBarFill.y = this._hpBarBg.y;
    this._hpLabel.x   = this.sprite.x;
    this._hpLabel.y   = this._hpBarBg.y - 12;
  }

  // ── Combat contract ─────────────────────────────────────────────────────────

  applyHit(hit) {
    const result = super.applyHit(hit);
    this._syncHpBar();
    this._checkPhaseTransition();
    return result;
  }

  // ── Phase management ────────────────────────────────────────────────────────

  _checkPhaseTransition() {
    const thresholds = this.bossConfig.phaseThresholds ?? [];
    while (
      this._nextThreshold < thresholds.length &&
      this.hp / this.maxHp <= thresholds[this._nextThreshold]
    ) {
      const idx = this._nextThreshold;
      this._nextThreshold += 1;
      this.phaseIndex = idx + 1;
      const phaseName = this.bossConfig.phaseNames?.[idx] ?? `Phase ${this.phaseIndex + 1}`;
      this.onPhaseChange(this.phaseIndex, phaseName);
      for (const cb of this._phaseListeners) {
        cb(this.phaseIndex, phaseName);
      }
    }
  }

  /** Override in subclasses for custom phase logic. */
  onPhaseChange(phaseIndex, phaseName) {}

  /** Subscribe to phase changes. */
  onPhaseTransition(cb) {
    this._phaseListeners.push(cb);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  destroy() {
    this._hpBarBg?.destroy();
    this._hpBarFill?.destroy();
    this._hpLabel?.destroy();
    super.destroy?.();
  }

  onUpdate(delta) {
    this._syncHpBar();
  }
}
