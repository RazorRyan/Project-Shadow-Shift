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
  }

  isAlive() {
    return this.hp > 0;
  }

  canBeHit() {
    return this.isAlive() && this.invulnTimer <= 0;
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
    this.nameText.setText(
      this.isAlive()
        ? `${this.label} ${this.hp}/${this.maxHp}`
        : `${this.label} defeated`
    );

    // Phase 26: skip AI logic when culled (out of range)
    if (!culled) {
      this.onUpdate(delta);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
  }

  // --- overridable hooks ---
  // eslint-disable-next-line no-unused-vars
  onHurt(_hit) {}
  // eslint-disable-next-line no-unused-vars
  onDefeat(_hit) {}
  // eslint-disable-next-line no-unused-vars
  onUpdate(_delta) {}
}
