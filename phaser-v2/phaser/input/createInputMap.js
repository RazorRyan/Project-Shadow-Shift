const INPUT_BINDINGS = {
  moveLeft: [Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.LEFT],
  moveRight: [Phaser.Input.Keyboard.KeyCodes.D, Phaser.Input.Keyboard.KeyCodes.RIGHT],
  aimDown: [Phaser.Input.Keyboard.KeyCodes.S, Phaser.Input.Keyboard.KeyCodes.DOWN],
  jump: [Phaser.Input.Keyboard.KeyCodes.SPACE],
  dash: [Phaser.Input.Keyboard.KeyCodes.SHIFT],
  attack: [Phaser.Input.Keyboard.KeyCodes.F],
  start: [Phaser.Input.Keyboard.KeyCodes.ENTER, Phaser.Input.Keyboard.KeyCodes.SPACE],
  debugDamage: [Phaser.Input.Keyboard.KeyCodes.H],
  swap: [Phaser.Input.Keyboard.KeyCodes.Q],
  element: [Phaser.Input.Keyboard.KeyCodes.E],
};

function anyKey(keys, predicate) {
  return keys.some(predicate);
}

export function createInputMap(scene) {
  const keyboard = scene.input.keyboard;
  const actions = Object.fromEntries(
    Object.entries(INPUT_BINDINGS).map(([action, codes]) => [
      action,
      codes.map((code) => keyboard.addKey(code))
    ])
  );

  return {
    isDown(action) {
      return anyKey(actions[action] ?? [], (key) => key.isDown);
    },

    wasPressed(action) {
      return anyKey(actions[action] ?? [], (key) => Phaser.Input.Keyboard.JustDown(key));
    },

    wasReleased(action) {
      return anyKey(actions[action] ?? [], (key) => Phaser.Input.Keyboard.JustUp(key));
    },

    getAxis(negativeAction, positiveAction) {
      return (this.isDown(positiveAction) ? 1 : 0) - (this.isDown(negativeAction) ? 1 : 0);
    }
  };
}
