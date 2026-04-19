const PLAYER_STATE_DEFAULTS = {
  maxHp: 5,
  invulnerabilityMs: 900,
  hurtMs: 180,
  respawnDelayMs: 900
};

export function createPlayerState(overrides = {}) {
  const state = {
    ...PLAYER_STATE_DEFAULTS,
    ...overrides
  };

  state.hp = state.maxHp;
  state.invulnerabilityTimer = 0;
  state.hurtTimer = 0;
  state.respawnTimer = 0;
  state.pendingRespawn = false;
  state.dead = false;
  return state;
}

export function resetPlayerState(state) {
  state.hp = state.maxHp;
  state.invulnerabilityTimer = 0;
  state.hurtTimer = 0;
  state.respawnTimer = 0;
  state.pendingRespawn = false;
  state.dead = false;
}

export function tickPlayerState(state, delta) {
  state.invulnerabilityTimer = Math.max(0, state.invulnerabilityTimer - delta);
  state.hurtTimer = Math.max(0, state.hurtTimer - delta);

  if (!state.dead) {
    return;
  }

  state.respawnTimer = Math.max(0, state.respawnTimer - delta);
  if (state.respawnTimer <= 0) {
    state.pendingRespawn = true;
  }
}

export function applyDamageToPlayer(state, damage = 1) {
  if (state.dead || state.invulnerabilityTimer > 0) {
    return null;
  }

  state.hp = Math.max(0, state.hp - damage);
  state.hurtTimer = state.hurtMs;

  if (state.hp <= 0) {
    state.dead = true;
    state.respawnTimer = state.respawnDelayMs;
    state.invulnerabilityTimer = 0;
    return {
      defeated: true,
      hp: state.hp
    };
  }

  state.invulnerabilityTimer = state.invulnerabilityMs;
  return {
    defeated: false,
    hp: state.hp
  };
}
