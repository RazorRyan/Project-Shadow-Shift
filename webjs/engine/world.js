(function initializeShadowShiftWorld(global) {
  function getDefaultRequirementState(state) {
    return {
      abilities: state.abilityUnlocked,
      element: state.element,
      world: state.world,
      weaponStage: state.player.weaponStage
    };
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

    if (requirements.anyOf?.length) {
      return requirements.anyOf.some((entry) => meetsRequirements(entry, state, context));
    }

    return true;
  }

  global.ShadowShiftWorld = {
    getDefaultRequirementState,
    meetsRequirements
  };
})(window);
