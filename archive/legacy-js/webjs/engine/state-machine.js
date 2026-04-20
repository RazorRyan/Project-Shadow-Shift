(function initializeShadowShiftStateMachine(global) {
  function createStateMachine(config) {
    const owner = config.owner;
    const states = config.states ?? {};
    let current = config.initialState ?? null;
    let stateTime = 0;

    function getStateDefinition(name) {
      return states[name] ?? {};
    }

    function canTransition(nextState, payload) {
      if (!nextState || nextState === current) {
        return false;
      }
      const currentDefinition = getStateDefinition(current);
      if (typeof currentDefinition.canExit === "function" && currentDefinition.canExit(owner, nextState, payload, api) === false) {
        return false;
      }
      const nextDefinition = getStateDefinition(nextState);
      if (typeof nextDefinition.canEnter === "function" && nextDefinition.canEnter(owner, current, payload, api) === false) {
        return false;
      }
      return true;
    }

    function transition(nextState, payload = {}) {
      if (!canTransition(nextState, payload)) {
        return false;
      }

      const previousState = current;
      const previousDefinition = getStateDefinition(previousState);
      if (typeof previousDefinition.exit === "function") {
        previousDefinition.exit(owner, nextState, payload, api);
      }

      current = nextState;
      stateTime = 0;

      const nextDefinition = getStateDefinition(current);
      if (typeof nextDefinition.enter === "function") {
        nextDefinition.enter(owner, previousState, payload, api);
      }

      return true;
    }

    function update(dt) {
      stateTime += dt;
      const definition = getStateDefinition(current);
      if (typeof definition.update === "function") {
        definition.update(owner, dt, api);
      }
    }

    function force(nextState, payload = {}) {
      if (current === nextState) {
        stateTime = 0;
        const currentDefinition = getStateDefinition(current);
        if (typeof currentDefinition.enter === "function") {
          currentDefinition.enter(owner, current, payload, api);
        }
        return true;
      }
      const previousDefinition = getStateDefinition(current);
      if (typeof previousDefinition.exit === "function") {
        previousDefinition.exit(owner, nextState, payload, api);
      }
      current = nextState;
      stateTime = 0;
      const nextDefinition = getStateDefinition(current);
      if (typeof nextDefinition.enter === "function") {
        nextDefinition.enter(owner, null, payload, api);
      }
      return true;
    }

    const api = {
      get current() {
        return current;
      },
      get timeInState() {
        return stateTime;
      },
      canTransition,
      transition,
      update,
      force
    };

    if (current) {
      const initialDefinition = getStateDefinition(current);
      if (typeof initialDefinition.enter === "function") {
        initialDefinition.enter(owner, null, { initial: true }, api);
      }
    }

    return api;
  }

  global.ShadowShiftStateMachine = {
    createStateMachine
  };
})(window);
