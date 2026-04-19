const PLAYER_PRESENTATION_PROFILES = {
  idle: {
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    tint: 0xf4efe1
  },
  run: {
    scaleX: 1.08,
    scaleY: 0.94,
    rotation: 0,
    tint: 0xf8f0de
  },
  jump: {
    scaleX: 0.92,
    scaleY: 1.08,
    rotation: -0.08,
    tint: 0xe8edf9
  },
  fall: {
    scaleX: 1.06,
    scaleY: 0.92,
    rotation: 0.06,
    tint: 0xd8e1f7
  },
  dash: {
    scaleX: 1.2,
    scaleY: 0.82,
    rotation: 0.02,
    tint: 0xc9f3ff
  },
  attack: {
    scaleX: 1.14,
    scaleY: 0.9,
    rotation: 0.12,
    tint: 0xfff1d6
  }
};

export function resolvePlayerPresentationState(player) {
  const body = player.sprite.body;

  if (player.dashTimer > 0) {
    return "dash";
  }

  if (player.getActiveAttackProfile()) {
    return "attack";
  }

  if (!player.isGrounded()) {
    return body.velocity.y < 0 ? "jump" : "fall";
  }

  if (Math.abs(body.velocity.x) > 26 || Math.abs(player.moveAxis) > 0) {
    return "run";
  }

  return "idle";
}

export function getPlayerPresentationProfile(state) {
  return PLAYER_PRESENTATION_PROFILES[state] ?? PLAYER_PRESENTATION_PROFILES.idle;
}
