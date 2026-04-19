export class TrainingDummy {
  constructor(scene, x, y, label = "Ruin Husk") {
    this.scene = scene;
    this.label = label;
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.spawnY = y;
    this.invulnTimer = 0;
    this.respawnTimer = 0;
    this.hurtFlashTimer = 0;
    this.idleOffset = Math.random() * Math.PI * 2;

    this.sprite = scene.physics.add.sprite(x, y, "training-dummy");
    this.sprite.setDisplaySize(56, 86);
    this.sprite.setSize(56, 86);
    this.sprite.setImmovable(true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setTint(label === "Guard Shell" ? 0xb8c8ff : 0xe2c8a0);

    this.healthText = scene.add.text(x, y - 78, `${this.label} HP ${this.hp}/${this.maxHp}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d7dceb"
    }).setOrigin(0.5, 0.5);
  }

  isAlive() {
    return this.hp > 0;
  }

  canBeHit() {
    return this.isAlive() && this.invulnTimer <= 0;
  }

  getHurtbox() {
    const body = this.sprite.body;
    return {
      x: body.x,
      y: body.y,
      w: body.width,
      h: body.height
    };
  }

  update(delta) {
    this.invulnTimer = Math.max(0, this.invulnTimer - delta);
    this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - delta);
    this.idleOffset += delta * 0.0024;

    if (!this.isAlive()) {
      this.respawnTimer = Math.max(0, this.respawnTimer - delta);
      if (this.respawnTimer <= 0) {
        this.hp = this.maxHp;
        this.sprite.setAlpha(1);
        this.sprite.setTint(this.label === "Guard Shell" ? 0xb8c8ff : 0xe2c8a0);
      }
    }

    if (this.hurtFlashTimer <= 0 && this.isAlive()) {
      this.sprite.setTint(this.label === "Guard Shell" ? 0xb8c8ff : 0xe2c8a0);
    }

    if (this.isAlive()) {
      this.sprite.y = this.spawnY + Math.sin(this.idleOffset) * 2.6;
    }

    this.healthText.setPosition(this.sprite.x, this.sprite.y - 78);
    this.healthText.setText(
      this.isAlive()
        ? `${this.label} HP ${this.hp}/${this.maxHp}`
        : `${this.label} rebuilding...`
    );
  }

  applyHit(hit) {
    if (!this.isAlive() || this.invulnTimer > 0) {
      return null;
    }

    this.hp = Math.max(0, this.hp - hit.damage);
    this.invulnTimer = 160;
    this.hurtFlashTimer = 110;
    this.sprite.setTint(hit.finisher ? 0xffd48c : hit.hitTag === "heavy" ? 0xffb280 : 0xffffff);

    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + (Math.sign(hit.knockbackX) || 1) * 10,
      duration: 55,
      yoyo: true,
      ease: "Quad.easeOut"
    });

    if (this.hp <= 0) {
      this.sprite.setAlpha(0.28);
      this.respawnTimer = 1600;
      return { defeated: true };
    }

    return { defeated: false };
  }
}
