/**
 * HUD manager — reads from game systems and pushes to domUiBridge.
 * Call update() once per frame.
 */
export function createHudManager(ui, player, elementSystem, weaponSystem, swapSystem) {
  return {
    update() {
      // Sync HP display each frame
      const hp    = player.isDead() ? 0 : player.getHealth();
      const maxHp = player.getMaxHealth();
      ui.setHp(hp, maxHp);
    },

    pushAll() {
      ui.setElement(elementSystem.getElement());
      ui.setWeapon(weaponSystem.getStage().label);
      ui.setWorldPhase(swapSystem.getPhase ? swapSystem.getPhase() : "Light");
      ui.setHp(player.getHealth(), player.getMaxHealth());
    },
  };
}
