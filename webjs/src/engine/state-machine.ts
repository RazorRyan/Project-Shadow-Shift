export interface StateMachineApi {
  readonly current: string | null;
  readonly timeInState: number;
  canTransition(nextState: string, payload?: any): boolean;
  transition(nextState: string, payload?: any): boolean;
  update(dt: number): void;
  force(nextState: string, payload?: any): boolean;
}

export function createStateMachine(config: any): StateMachineApi {
  const owner = config.owner;
  const states = config.states ?? {};
  let current: string | null = config.initialState ?? null;
  let stateTime = 0;

  function getDef(name: string | null) { return name ? (states[name] ?? {}) : {}; }

  function canTransition(nextState: string, payload: any = {}): boolean {
    if (!nextState || nextState === current) return false;
    const curDef = getDef(current);
    if (typeof curDef.canExit === "function" && curDef.canExit(owner, nextState, payload, api) === false) return false;
    const nextDef = getDef(nextState);
    if (typeof nextDef.canEnter === "function" && nextDef.canEnter(owner, current, payload, api) === false) return false;
    return true;
  }

  function transition(nextState: string, payload: any = {}): boolean {
    if (!canTransition(nextState, payload)) return false;
    const prev = current;
    const prevDef = getDef(prev);
    if (typeof prevDef.exit === "function") prevDef.exit(owner, nextState, payload, api);
    current = nextState;
    stateTime = 0;
    const nextDef = getDef(current);
    if (typeof nextDef.enter === "function") nextDef.enter(owner, prev, payload, api);
    return true;
  }

  function update(dt: number) {
    stateTime += dt;
    const def = getDef(current);
    if (typeof def.update === "function") def.update(owner, dt, api);
  }

  function force(nextState: string, payload: any = {}): boolean {
    if (current === nextState) {
      stateTime = 0;
      const def = getDef(current);
      if (typeof def.enter === "function") def.enter(owner, current, payload, api);
      return true;
    }
    const prevDef = getDef(current);
    if (typeof prevDef.exit === "function") prevDef.exit(owner, nextState, payload, api);
    current = nextState;
    stateTime = 0;
    const nextDef = getDef(current);
    if (typeof nextDef.enter === "function") nextDef.enter(owner, null, payload, api);
    return true;
  }

  const api: StateMachineApi = {
    get current() { return current; },
    get timeInState() { return stateTime; },
    canTransition, transition, update, force
  };

  if (current) {
    const initDef = getDef(current);
    if (typeof initDef.enter === "function") initDef.enter(owner, null, { initial: true }, api);
  }

  return api;
}
