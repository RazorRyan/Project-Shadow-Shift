export function createInputMap(scene) {
  return scene.input.keyboard.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.A,
    leftAlt: Phaser.Input.Keyboard.KeyCodes.LEFT,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    downAlt: Phaser.Input.Keyboard.KeyCodes.DOWN,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    rightAlt: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
    dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    attack: Phaser.Input.Keyboard.KeyCodes.F,
    start: Phaser.Input.Keyboard.KeyCodes.ENTER
  });
}
