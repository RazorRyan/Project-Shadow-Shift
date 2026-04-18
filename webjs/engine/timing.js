(function initializeShadowShiftTiming(global) {
  function createTimingController(options = {}) {
    const fixedStepSeconds = options.fixedStepSeconds ?? (1 / 120);
    const maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? (1 / 30);
    const maxFixedSteps = options.maxFixedSteps ?? 4;

    let lastTimestamp = null;
    let accumulatorSeconds = 0;
    let frameIndex = 0;

    function reset(now = null) {
      lastTimestamp = now;
      accumulatorSeconds = 0;
      frameIndex = 0;
    }

    function beginFrame(now, flags = {}) {
      if (lastTimestamp == null) {
        lastTimestamp = now;
      }

      const rawDeltaSeconds = Math.max(0, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      frameIndex += 1;

      const clampedDeltaSeconds = Math.min(rawDeltaSeconds, maxFrameDeltaSeconds);
      const paused = Boolean(flags.paused);
      const freezeSimulation = Boolean(flags.freezeSimulation);
      const timeScale = flags.timeScale ?? 1;
      const simulationDeltaSeconds = paused || freezeSimulation ? 0 : clampedDeltaSeconds * timeScale;

      accumulatorSeconds = Math.min(
        accumulatorSeconds + simulationDeltaSeconds,
        fixedStepSeconds * maxFixedSteps
      );

      let fixedSteps = 0;
      while (accumulatorSeconds >= fixedStepSeconds && fixedSteps < maxFixedSteps) {
        accumulatorSeconds -= fixedStepSeconds;
        fixedSteps += 1;
      }

      return {
        frameIndex,
        now,
        rawDeltaSeconds,
        clampedDeltaSeconds,
        fixedStepSeconds,
        fixedSteps,
        alpha: fixedStepSeconds > 0 ? accumulatorSeconds / fixedStepSeconds : 0,
        paused,
        freezeSimulation,
        timeScale
      };
    }

    return {
      beginFrame,
      reset
    };
  }

  global.ShadowShiftTiming = {
    createTimingController
  };
})(window);
