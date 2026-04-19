export function createTimingController(options: any = {}) {
  const fixedStepSeconds = options.fixedStepSeconds ?? (1 / 120);
  const maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? (1 / 30);
  const maxFixedSteps = options.maxFixedSteps ?? 4;

  let lastTimestamp: number | null = null;
  let accumulatorSeconds = 0;
  let frameIndex = 0;

  function reset(now: number | null = null) {
    lastTimestamp = now;
    accumulatorSeconds = 0;
    frameIndex = 0;
  }

  function beginFrame(now: number, flags: any = {}) {
    if (lastTimestamp == null) lastTimestamp = now;
    const rawDeltaSeconds = Math.max(0, (now - lastTimestamp) / 1000);
    lastTimestamp = now;
    frameIndex += 1;

    const clampedDeltaSeconds = Math.min(rawDeltaSeconds, maxFrameDeltaSeconds);
    const paused = Boolean(flags.paused);
    const freezeSimulation = Boolean(flags.freezeSimulation);
    const timeScale = flags.timeScale ?? 1;
    const simulationDeltaSeconds = paused || freezeSimulation ? 0 : clampedDeltaSeconds * timeScale;

    accumulatorSeconds = Math.min(accumulatorSeconds + simulationDeltaSeconds, fixedStepSeconds * maxFixedSteps);

    let fixedSteps = 0;
    while (accumulatorSeconds >= fixedStepSeconds && fixedSteps < maxFixedSteps) {
      accumulatorSeconds -= fixedStepSeconds;
      fixedSteps++;
    }

    return {
      frameIndex, now, rawDeltaSeconds, clampedDeltaSeconds,
      fixedStepSeconds, fixedSteps,
      alpha: fixedStepSeconds > 0 ? accumulatorSeconds / fixedStepSeconds : 0,
      paused, freezeSimulation, timeScale
    };
  }

  return { reset, beginFrame };
}
