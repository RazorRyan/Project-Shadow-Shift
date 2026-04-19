(function initializeShadowShiftReactivity(global) {
  function ensureReactiveState(object) {
    object.reactiveState = object.reactiveState ?? {
      pulses: {},
      flags: {}
    };
    return object.reactiveState;
  }

  function setReactivePulse(object, key, duration) {
    const reactiveState = ensureReactiveState(object);
    reactiveState.pulses[key] = Math.max(reactiveState.pulses[key] ?? 0, duration);
  }

  function getReactivePulse(object, key) {
    return object.reactiveState?.pulses?.[key] ?? 0;
  }

  function setReactiveFlag(object, key, value = true) {
    const reactiveState = ensureReactiveState(object);
    reactiveState.flags[key] = value;
  }

  function getReactiveFlag(object, key) {
    return Boolean(object.reactiveState?.flags?.[key]);
  }

  function updateReactiveTimers(objects, dt) {
    for (const object of objects ?? []) {
      const reactiveState = object?.reactiveState;
      if (!reactiveState?.pulses) {
        continue;
      }

      for (const key of Object.keys(reactiveState.pulses)) {
        reactiveState.pulses[key] = Math.max(0, reactiveState.pulses[key] - dt);
      }
    }
  }

  function triggerReactiveObject(object, trigger) {
    ensureReactiveState(object);
    const supportedTriggers = object.reactivity?.triggers ?? [];
    if (!supportedTriggers.includes(trigger.type)) {
      return {
        accepted: false
      };
    }

    if (trigger.type === "swap") {
      setReactivePulse(object, "swap", 0.8);
      if (object.reactivity?.responses?.swap?.setFlag) {
        setReactiveFlag(object, object.reactivity.responses.swap.setFlag, true);
      }
      return {
        accepted: true,
        message: object.reactivity?.responses?.swap?.message ?? null
      };
    }

    if (trigger.type === "rest") {
      setReactivePulse(object, "rest", 1.2);
      if (object.reactivity?.responses?.rest?.setFlag) {
        setReactiveFlag(object, object.reactivity.responses.rest.setFlag, true);
      }
      return {
        accepted: true,
        message: object.reactivity?.responses?.rest?.message ?? null
      };
    }

    if (trigger.type === "attack") {
      setReactivePulse(object, "attack", 0.45);
      return {
        accepted: true,
        message: object.reactivity?.responses?.attack?.message ?? null
      };
    }

    if (trigger.type === "approach") {
      setReactivePulse(object, "approach", 0.35);
      return {
        accepted: true,
        message: object.reactivity?.responses?.approach?.message ?? null
      };
    }

    return {
      accepted: false
    };
  }

  global.ShadowShiftReactivity = {
    ensureReactiveState,
    setReactivePulse,
    getReactivePulse,
    setReactiveFlag,
    getReactiveFlag,
    updateReactiveTimers,
    triggerReactiveObject
  };
})(window);
