import { ENEMY_STATS } from "../data/enemyStats.js";

/**
 * EnemyBase — shared foundation for all enemy types.
 *
 * Implements the combat contract:
 *   canBeHit()   -> boolean
 *   getHurtbox() -> { x, y, w, h }
 *   applyHit(hit) -> { defeated } | null
 *
 * Overridable hooks (no-ops by default):
 *   onHurt(hit)
 *   onDefeat(hit)
 *   onUpdate(delta)
 */
export class EnemyBase {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} statKey  - key in ENEMY_STATS
   */
  constructor(scene, x, y, statKey = "ruin_husk") {
    this.scene = scene;
    this.stats = ENEMY_STATS[statKey];
    this.label = this.stats.label;
    this.spawnX = x;
    this.spawnY = y;
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.facing = 1;
    this.invulnTimer = 0;
    this.hurtFlashTimer = 0;
    this.defeated = false;

    this.sprite = scene.physics.add.sprite(x, y, this.stats.textureKey);
    this.sprite.setDisplaySize(this.stats.width, this.stats.height);
    this.sprite.setSize(this.stats.width, this.stats.height);
    this.sprite.setTint(this.stats.tint);

    this.nameText = scene.add.text(x, y - this.stats.height * 0.5 - 14, this.label, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#c8d0e8",
    }).setOrigin(0.5, 1);
    this.alertText = scene.add.text(x, y - this.stats.height * 0.5 - 38, "", {
      fontFamily: "monospace",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffd9a1",
      stroke: "#140d08",
      strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);
    this._lastDisplayName = this.label;
    this._alertLabel = "";
    this._alertColor = "#ffd9a1";
  }

  isAlive() {
    return this.hp > 0;
  }

  canBeHit() {
    return this.isAlive() && this.invulnTimer <= 0;
  }

  setFacing(direction) {
    this.facing = direction >= 0 ? 1 : -1;
    this.sprite.setFlipX(this.facing < 0);
  }

  resetCombatState() {
    this.hp = this.maxHp;
    this.invulnTimer = 0;
    this.hurtFlashTimer = 0;
    this.defeated = false;
    this.sprite.setAlpha(1);
    this.sprite.setTint(this.stats.tint);
    this.sprite.setPosition(this.spawnX, this.spawnY);
    this.sprite.body.setVelocity(0, 0);
    this.clearAlert();
  }

  revive() {
    this.resetCombatState();
    this._lastDisplayName = "";
    this.onRevive();
  }

  getHurtbox() {
    const body = this.sprite.body;
    return { x: body.x, y: body.y, w: body.width, h: body.height };
  }

  applyHit(hit) {
    if (!this.canBeHit()) return null;

    this.hp = Math.max(0, this.hp - hit.damage);
    this.invulnTimer = this.stats.invulnMs;
    this.hurtFlashTimer = this.stats.hurtFlashMs;

    const flashTint = hit.finisher ? 0xffd48c : hit.hitTag === "heavy" ? 0xffb280 : 0xffffff;
    this.sprite.setTint(flashTint);

    const kbDir = Math.sign(hit.knockbackX) || 1;
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + kbDir * 12,
      duration: 60,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    if (this.hp <= 0) {
      this.defeated = true;
      this.sprite.setAlpha(0.25);
      this.onDefeat(hit);
      return { defeated: true };
    }

    this.onHurt(hit);
    return { defeated: false };
  }

  update(delta, culled = false) {
    this.invulnTimer = Math.max(0, this.invulnTimer - delta);
    this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - delta);

    if (this.hurtFlashTimer <= 0 && this.isAlive()) {
      this.sprite.setTint(this.stats.tint);
    }

    this.nameText.setPosition(
      this.sprite.x,
      this.sprite.y - this.stats.height * 0.5 - 4
    );
    this.alertText.setPosition(
      this.sprite.x,
      this.sprite.y - this.stats.height * 0.5 - 28
    );
    const displayName = this.getDisplayName();
    if (displayName !== this._lastDisplayName) {
      this.nameText.setText(displayName);
      this._lastDisplayName = displayName;
    }
    if (this.alertText.visible) {
      const pulse = 1 + Math.sin(this.scene.time.now / 55) * 0.08;
      this.alertText.setScale(pulse);
    }

    // Phase 26: skip AI logic when culled (out of range)
    if (!culled) {
      this.onUpdate(delta);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
    this.alertText.destroy();
  }

  setAlert(label, color = "#ffd9a1") {
    if (label !== this._alertLabel) {
      this.alertText.setText(label);
      this._alertLabel = label;
    }
    if (color !== this._alertColor) {
      this.alertText.setColor(color);
      this._alertColor = color;
    }
    this.alertText.setVisible(Boolean(label));
  }

  clearAlert() {
    this._alertLabel = "";
    this._alertColor = "#ffd9a1";
    this.alertText.setText("");
    this.alertText.setVisible(false);
    this.alertText.setScale(1);
  }

  // --- overridable hooks ---
  getDisplayName() {
    return this.isAlive()
      ? `${this.label} ${this.hp}/${this.maxHp}`
      : `${this.label} defeated`;
  }

  // eslint-disable-next-line no-unused-vars
  onHurt(_hit) {}
  // eslint-disable-next-line no-unused-vars
  onDefeat(_hit) {}
  onRevive() {}
  // eslint-disable-next-line no-unused-vars
  onWorldPhaseChanged(_phase) {}
  // eslint-disable-next-line no-unused-vars
  onUpdate(_delta) {}
}
