/**
 * NpcEntity — a static interactable character.
 * Draws as a simple coloured rectangle until proper sprites are available.
 *
 * Contract:
 *   update(player, interactJustPressed) → returns dialogueId string if dialogue
 *   should start, else null.
 */
export class NpcEntity {
  /**
   * @param {Phaser.Scene}  scene
   * @param {object}  config  { x, y, dialogueId, label }
   */
  constructor(scene, config) {
    this.scene      = scene;
    this.dialogueId = config.dialogueId ?? "ashen_warden";
    this.label      = config.label ?? "NPC";
    this.promptText = config.promptText ?? "[Z] Talk";

    // Visual representation
    this.sprite = scene.add.rectangle(config.x, config.y, 28, 48, 0x4a9eff).setDepth(3);

    // Label
    this.nameTag = scene.add.text(config.x, config.y - 36, this.label, {
      fontSize: "9px",
      fontFamily: "monospace",
      color: "#a0c4ff",
    }).setOrigin(0.5, 1).setDepth(4);

    // Interact prompt (hidden until in range)
    this.prompt = scene.add.text(config.x, config.y - 54, this.promptText, {
      fontSize: "9px",
      fontFamily: "monospace",
      color: "#ffe060",
    }).setOrigin(0.5, 1).setDepth(4).setVisible(false);

    // Interaction range rectangle (world-space)
    this.interactRange = new Phaser.Geom.Rectangle(config.x - 56, config.y - 50, 112, 96);
  }

  update(player, interactJustPressed) {
    const px = player.sprite.x;
    const py = player.sprite.y;

    const inRange = this.interactRange.contains(px, py);
    this.prompt.setVisible(inRange);

    if (inRange && interactJustPressed) {
      return {
        dialogueId: this.dialogueId,
        label: this.label,
      };
    }
    return null;
  }

  destroy() {
    this.sprite.destroy();
    this.nameTag.destroy();
    this.prompt.destroy();
  }
}
