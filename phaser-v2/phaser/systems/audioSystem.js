/**
 * Audio system — centralised SFX/music routing.
 *
 * Phaser scenes pass their `sound` manager in; the system maps
 * semantic action names to audio keys.  All keys are stubs until
 * actual assets are loaded — missing keys are silently ignored so
 * the game never throws on missing audio.
 */

/** Map of semantic action → Phaser audio key */
const SFX_MAP = {
  jump:        "sfx_jump",
  dash:        "sfx_dash",
  land:        "sfx_land",
  attack:      "sfx_attack",
  hit:         "sfx_hit",
  hitWeak:     "sfx_hit_weak",
  swap:        "sfx_swap",
  element:     "sfx_element",
  weaponUp:    "sfx_weapon_up",
  checkpoint:  "sfx_checkpoint",
  dialogue:    "sfx_dialogue",
  bossPhase:   "sfx_boss_phase",
  save:        "sfx_save",
};

/** Default volume per category */
const SFX_CONFIG = {
  volume: 0.7,
};

/**
 * @param {Phaser.Sound.BaseSoundManager} soundManager
 */
export function createAudioSystem(soundManager) {
  let _muted = false;

  function play(action, overrides = {}) {
    if (_muted) return;
    const key = SFX_MAP[action];
    if (!key) return;
    if (!soundManager.get(key) && !soundManager.sounds.find(s => s.key === key)) {
      // Key not loaded — skip silently
      return;
    }
    soundManager.play(key, { volume: SFX_CONFIG.volume, ...overrides });
  }

  return {
    play,
    mute()   { _muted = true; },
    unmute() { _muted = false; },
    isMuted() { return _muted; },

    // Convenience shorthands
    onJump()       { play("jump"); },
    onDash()       { play("dash"); },
    onLand()       { play("land"); },
    onAttack()     { play("attack"); },
    onHit()        { play("hit"); },
    onHitWeak()    { play("hitWeak"); },
    onSwap()       { play("swap"); },
    onElement()    { play("element"); },
    onWeaponUp()   { play("weaponUp"); },
    onCheckpoint() { play("checkpoint"); },
    onDialogue()   { play("dialogue"); },
    onBossPhase()  { play("bossPhase"); },
    onSave()       { play("save"); },
  };
}
