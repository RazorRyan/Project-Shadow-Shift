import { createTimingController } from "./timing";

export function createRuntime(config: any) {
  const timing = createTimingController(config.timing);
  const getFrameFlags = config.getFrameFlags ?? (() => ({}));
  const onFrame: (snapshot: any) => void = config.onFrame;

  function frame(now: number) {
    const snapshot = timing.beginFrame(now, getFrameFlags());
    onFrame(snapshot);
    requestAnimationFrame(frame);
  }

  return {
    start() {
      timing.reset(performance.now());
      requestAnimationFrame(frame);
    },
    reset(now = performance.now()) {
      timing.reset(now);
    }
  };
}
