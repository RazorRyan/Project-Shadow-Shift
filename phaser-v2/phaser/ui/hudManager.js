/**
 * HUD manager — reads from game systems and pushes to domUiBridge.
 * Call update() once per frame.
 */
export function createHudManager(ui, player, elementSystem, weaponSystem, swapSystem, checkpointSystem) {
  function buildMapSummary() {
    const visitedRooms = checkpointSystem?.getVisitedRooms?.() ?? [];
    const roomCount = visitedRooms.length;
    return `${roomCount} room${roomCount === 1 ? "" : "s"} charted`;
  }

  function buildCheckpointLabel() {
    const checkpoint = checkpointSystem?.getActive?.();
    return checkpoint?.label ?? checkpoint?.id ?? "Unbound";
  }

  return {
    update() {
      const hp    = player.isDead() ? 0 : player.getHealth();
      const maxHp = player.getMaxHealth();
      ui.setHp(hp, maxHp);
      ui.setElement(elementSystem.getElement());
      ui.setWeapon(weaponSystem.getStage().label);
      ui.setWorldPhase(swapSystem.getPhase ? swapSystem.getPhase() : "Light");
      ui.setMapSummary(buildMapSummary());
      ui.setCheckpoint(buildCheckpointLabel());
    },

    pushAll() {
      ui.setElement(elementSystem.getElement());
      ui.setWeapon(weaponSystem.getStage().label);
      ui.setWorldPhase(swapSystem.getPhase ? swapSystem.getPhase() : "Light");
      ui.setHp(player.getHealth(), player.getMaxHealth());
      ui.setMapSummary(buildMapSummary());
      ui.setCheckpoint(buildCheckpointLabel());
    },
  };
}
