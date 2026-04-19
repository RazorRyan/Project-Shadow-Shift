import { IMPACT_FX_CONFIG } from "../fx/impactFxConfig.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function interpolate(min, max, t) {
  return min + (max - min) * t;
}

export function createImpactFeedbackSystem(scene) {
  return {
    triggerLanding(impact) {
      if (!impact || impact.fallSpeed < IMPACT_FX_CONFIG.landing.minFallSpeed) {
        return;
      }

      const config = IMPACT_FX_CONFIG.landing;
      const normalized = clamp01(
        (impact.fallSpeed - config.minFallSpeed) / (config.maxFallSpeed - config.minFallSpeed)
      );
      const radius = interpolate(config.minDustRadius, config.maxDustRadius, normalized);
      const duration = interpolate(config.minShakeDuration, config.maxShakeDuration, normalized);

      scene.cameras.main.shake(duration, config.shakeIntensity);

      const dust = scene.add.circle(impact.x, impact.y - 2, radius * 0.45, config.dustColor, config.dustAlpha);
      dust.setDepth(5);

      scene.tweens.add({
        targets: dust,
        scaleX: 1.35,
        scaleY: 0.65,
        alpha: 0,
        y: impact.y - config.dustLift,
        duration: config.dustDuration,
        ease: "Quad.easeOut",
        onComplete: () => dust.destroy()
      });
    }
  };
}
