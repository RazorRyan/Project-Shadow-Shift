(function initializeShadowShiftRuntime(global) {
  function createRuntime(config) {
    const timing = global.ShadowShiftTiming.createTimingController(config.timing);
    const getFrameFlags = config.getFrameFlags ?? (() => ({}));
    const onFrame = config.onFrame;

    function frame(now) {
      const snapshot = timing.beginFrame(now, getFrameFlags());
      onFrame(snapshot);
      global.requestAnimationFrame(frame);
    }

    return {
      start() {
        timing.reset(global.performance.now());
        global.requestAnimationFrame(frame);
      },
      reset(now = global.performance.now()) {
        timing.reset(now);
      }
    };
  }

  global.ShadowShiftRuntime = {
    createRuntime
  };
})(window);
