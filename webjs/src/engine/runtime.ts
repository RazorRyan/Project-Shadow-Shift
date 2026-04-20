import { createTimingController } from "./timing";
import type { RuntimeConfig } from "./types";

export function createRuntime(config: RuntimeConfig) {
  const timing = createTimingController(config.timing);
  const getFrameFlags = config.getFrameFlags ?? (() => ({}));
  const onFrame = config.onFrame;

  function frame(now: number): void {
    const snapshot = timing.beginFrame(now, getFrameFlags());
    onFrame(snapshot);
    requestAnimationFrame(frame);
  }

  return {
    start(): void {
      timing.reset(performance.now());
      requestAnimationFrame(frame);
    },
    reset(now = performance.now()): void {
      timing.reset(now);
    }
  };
}
