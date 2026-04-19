import { getPlayerPresentationProfile, resolvePlayerPresentationState } from "../components/playerPresentationState.js";

function approach(current, target, rate, deltaSeconds) {
  if (current < target) {
    return Math.min(current + rate * deltaSeconds, target);
  }

  if (current > target) {
    return Math.max(current - rate * deltaSeconds, target);
  }

  return target;
}

export function createPlayerPresentationDriver(player) {
  return {
    state: "idle",

    update(delta) {
      const deltaSeconds = delta / 1000;
      const sprite = player.sprite;
      const nextState = resolvePlayerPresentationState(player);
      const profile = getPlayerPresentationProfile(nextState);

      this.state = nextState;

      sprite.setFlipX(player.facing < 0);
      sprite.setScale(
        approach(sprite.scaleX, profile.scaleX, 10, deltaSeconds),
        approach(sprite.scaleY, profile.scaleY, 10, deltaSeconds)
      );
      sprite.setRotation(approach(sprite.rotation, profile.rotation * player.facing, 14, deltaSeconds));
      sprite.setTint(profile.tint);
    }
  };
}
