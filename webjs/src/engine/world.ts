export function getProgressionState(state: any) {
  return {
    abilities: state.abilityUnlocked,
    elements: {
      FireShift: state.abilityUnlocked?.FireShift !== false,
      IceShift: state.abilityUnlocked?.IceShift !== false,
      WindShift: state.abilityUnlocked?.WindShift !== false,
      ShadowSwap: state.abilityUnlocked?.ShadowSwap !== false
    },
    keyItems: state.progression?.keyItems ?? {},
    worldFlags: state.progression?.worldFlags ?? {},
    optionalSecrets: state.progression?.optionalSecrets ?? {},
    visitedRooms: state.roomState?.visitedRooms ?? {},
    element: state.element,
    world: state.world,
    weaponStage: state.player.weaponStage
  };
}

export function meetsRequirements(requirements: any, state: any, context: any = {}): boolean {
  if (!requirements) return true;
  const rs = context.requirementState ?? getProgressionState(state);

  if (requirements.abilities) {
    for (const ability of requirements.abilities) {
      if (!rs.abilities?.[ability]) return false;
    }
  }
  if (requirements.element && rs.element !== requirements.element) return false;
  if (requirements.world && rs.world !== requirements.world) return false;
  if (requirements.minWeaponStage != null && rs.weaponStage < requirements.minWeaponStage) return false;
  if (requirements.keyItems) {
    for (const itemId of requirements.keyItems) {
      if (!rs.keyItems?.[itemId]) return false;
    }
  }
  if (requirements.worldFlags) {
    for (const flagId of requirements.worldFlags) {
      if (!rs.worldFlags?.[flagId]) return false;
    }
  }
  if (requirements.secrets) {
    for (const secretId of requirements.secrets) {
      if (!rs.optionalSecrets?.[secretId]) return false;
    }
  }
  if (requirements.visitedRooms) {
    for (const roomId of requirements.visitedRooms) {
      if (!rs.visitedRooms?.[roomId]) return false;
    }
  }
  return true;
}
