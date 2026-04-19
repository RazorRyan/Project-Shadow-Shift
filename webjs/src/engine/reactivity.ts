export function ensureReactiveState(object: any) {
  object.reactiveState = object.reactiveState ?? { pulses: {}, flags: {} };
  return object.reactiveState;
}

export function setReactivePulse(object: any, key: string, duration: number) {
  const rs = ensureReactiveState(object);
  rs.pulses[key] = Math.max(rs.pulses[key] ?? 0, duration);
}

export function getReactivePulse(object: any, key: string): number {
  return object.reactiveState?.pulses?.[key] ?? 0;
}

export function setReactiveFlag(object: any, key: string, value = true) {
  ensureReactiveState(object).flags[key] = value;
}

export function getReactiveFlag(object: any, key: string): boolean {
  return Boolean(object.reactiveState?.flags?.[key]);
}

export function updateReactiveTimers(objects: any[], dt: number) {
  for (const object of objects ?? []) {
    const rs = object?.reactiveState;
    if (!rs?.pulses) continue;
    for (const key of Object.keys(rs.pulses)) {
      rs.pulses[key] = Math.max(0, rs.pulses[key] - dt);
    }
  }
}

export function triggerReactiveObject(object: any, trigger: { type: string; [key: string]: any }) {
  ensureReactiveState(object);
  const supported = object.reactivity?.triggers ?? [];
  if (!supported.includes(trigger.type)) return { accepted: false };

  if (trigger.type === "swap") {
    setReactivePulse(object, "swap", 0.8);
    if (object.reactivity?.responses?.swap?.setFlag) setReactiveFlag(object, object.reactivity.responses.swap.setFlag, true);
    return { accepted: true, message: object.reactivity?.responses?.swap?.message ?? null };
  }
  if (trigger.type === "rest") {
    setReactivePulse(object, "rest", 1.2);
    if (object.reactivity?.responses?.rest?.setFlag) setReactiveFlag(object, object.reactivity.responses.rest.setFlag, true);
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
