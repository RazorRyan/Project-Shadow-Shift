import type { ReactiveObject, ReactiveState, ReactiveTrigger, ReactiveResult, ReactiveTriggerType } from "./types";

export function ensureReactiveState(object: ReactiveObject): ReactiveState {
  if (!object.reactiveState) object.reactiveState = { pulses: {}, flags: {} };
  return object.reactiveState;
}

export function setReactivePulse(object: ReactiveObject, key: string, duration: number): void {
  const rs = ensureReactiveState(object);
  rs.pulses[key] = Math.max(rs.pulses[key] ?? 0, duration);
}

export function getReactivePulse(object: ReactiveObject, key: string): number {
  return object.reactiveState?.pulses?.[key] ?? 0;
}

export function setReactiveFlag(object: ReactiveObject, key: string, value = true): void {
  ensureReactiveState(object).flags[key] = value;
}

export function getReactiveFlag(object: ReactiveObject, key: string): boolean {
  return Boolean(object.reactiveState?.flags?.[key]);
}

export function updateReactiveTimers(objects: ReactiveObject[], dt: number): void {
  for (const object of objects ?? []) {
    const rs = object?.reactiveState;
    if (!rs?.pulses) continue;
    for (const key of Object.keys(rs.pulses)) {
      rs.pulses[key] = Math.max(0, rs.pulses[key] - dt);
    }
  }
}

export function triggerReactiveObject(object: ReactiveObject, trigger: ReactiveTrigger): ReactiveResult {
  ensureReactiveState(object);
  const supported: ReactiveTriggerType[] = object.reactivity?.triggers ?? [];
  if (!supported.includes(trigger.type)) return { accepted: false };

  if (trigger.type === "swap") {
    setReactivePulse(object, "swap", 0.8);
    const flag = object.reactivity?.responses?.swap?.setFlag;
    if (flag) setReactiveFlag(object, flag, true);
    return { accepted: true, message: object.reactivity?.responses?.swap?.message ?? null };
  }
  if (trigger.type === "rest") {
    setReactivePulse(object, "rest", 1.2);
    const flag = object.reactivity?.responses?.rest?.setFlag;
    if (flag) setReactiveFlag(object, flag, true);
    return { accepted: true, message: object.reactivity?.responses?.rest?.message ?? null };
  }
  if (trigger.type === "attack") {
    setReactivePulse(object, "attack", 0.45);
    return { accepted: true, message: object.reactivity?.responses?.attack?.message ?? null };
  }
  if (trigger.type === "approach") {
    setReactivePulse(object, "approach", 0.35);
    return { accepted: true, message: object.reactivity?.responses?.approach?.message ?? null };
  }
  return { accepted: false };
}
