(function initializeShadowShiftWorld(global) {
  function getProgressionState(state) {
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

  function getDefaultRequirementState(state) {
    return getProgressionState(state);
  }

  function meetsRequirements(requirements, state, context = {}) {
    if (!requirements) {
      return true;
    }

    const requirementState = context.requirementState ?? getDefaultRequirementState(state);

    if (requirements.abilities) {
      for (const ability of requirements.abilities) {
        if (!requirementState.abilities?.[ability]) {
          return false;
        }
      }
    }

    if (requirements.element && requirementState.element !== requirements.element) {
      return false;
    }

    if (requirements.world && requirementState.world !== requirements.world) {
      return false;
    }

    if (requirements.minWeaponStage != null && requirementState.weaponStage < requirements.minWeaponStage) {
      return false;
    }

    if (requirements.keyItems) {
      for (const itemId of requirements.keyItems) {
        if (!requirementState.keyItems?.[itemId]) {
          return false;
        }
      }
    }

    if (requirements.worldFlags) {
      for (const flagId of requirements.worldFlags) {
        if (!requirementState.worldFlags?.[flagId]) {
          return false;
        }
      }
    }

    if (requirements.secrets) {
      for (const secretId of requirements.secrets) {
        if (!requirementState.optionalSecrets?.[secretId]) {
          return false;
        }
      }
    }

    if (requirements.visitedRooms) {
      for (const roomId of requirements.visitedRooms) {
        if (!requirementState.visitedRooms?.[roomId]) {
          return false;
        }
      }
    }

    if (requirements.anyOf?.length) {
      return requirements.anyOf.some((entry) => meetsRequirements(entry, state, context));
    }

    return true;
  }

  global.ShadowShiftWorld = {
    getProgressionState,
    getDefaultRequirementState,
    meetsRequirements
  };
})(window);
