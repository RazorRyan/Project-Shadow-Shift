import { COMBO_ATTACK_DEFINITIONS, PLAYER_COMBAT_CONFIG } from "../config/playerCombatConfig.js";

function getAttackWidth() {
  return PLAYER_COMBAT_CONFIG.attackWidth;
}

export function getAttackDamage(profile) {
  return PLAYER_COMBAT_CONFIG.baseDamage + (profile?.damageBonus ?? 0);
}

function getNextComboIndex(player) {
  return player.comboChainTimer > 0
    ? Math.min(player.comboStep + 1, COMBO_ATTACK_DEFINITIONS.length - 1)
    : 0;
}

function buildComboAttackProfile(player, definition, comboIndex) {
  const attackWidth = getAttackWidth();
  return {
    id: definition.id,
    type: "combo",
    comboIndex,
    damageBonus: definition.damageBonus,
    width: attackWidth + definition.widthBonus,
    height: definition.height,
    offsetX: player.facing > 0 ? player.config.width : -(attackWidth + definition.widthBonus),
    offsetY: definition.offsetY,
    attackTimeMs: definition.activeTimeMs,
    cooldownMs: definition.cooldownMs,
    recoverMs: definition.recoveryMs,
    forwardBoost: definition.movementImpulse,
    knockback: definition.knockback,
    comboWindowMs: definition.comboWindowMs,
    queueWindowMs: definition.queueWindowMs,
    finisher: definition.finisher,
    hitTag: definition.hitTag
  };
}

export function getAttackProfile(player, mode = "auto") {
  const downslashRequested = mode === "downslash" || (mode === "auto" && !player.isGrounded() && player.getVerticalAim() > 0);

  if (downslashRequested) {
    const attackWidth = getAttackWidth();
    const width = Math.max(42, attackWidth - 18);
    return {
      id: "downslash",
      type: "downslash",
      damageBonus: 0,
      width,
      height: 58,
      offsetX: -((width - player.config.width) * 0.5),
      offsetY: player.config.height - 8,
      attackTimeMs: 130,
      cooldownMs: 160,
      recoverMs: 80,
      forwardBoost: 0,
      knockback: 180,
      comboWindowMs: 0,
      queueWindowMs: 0,
      bounceStrength: 520,
      hitTag: "pogo"
    };
  }

  const comboIndex = getNextComboIndex(player);
  return buildComboAttackProfile(player, COMBO_ATTACK_DEFINITIONS[comboIndex], comboIndex);
}

export function getCurrentAttackBox(player, profile, rangeBonus = 0) {
  const body = player.sprite.body;
  const w = profile.width + rangeBonus;
  const offsetX = player.facing > 0
    ? (profile.type === "downslash" ? profile.offsetX : profile.offsetX)
    : profile.type === "downslash" ? profile.offsetX : profile.offsetX - rangeBonus;
  return {
    x: body.x + offsetX,
    y: body.y + profile.offsetY,
    w,
    h: profile.height
  };
}

export function canQueueComboAttack(player) {
  const profile = getAttackProfile(player, "normal");
  return player.attackType === "combo"
    && player.comboChainTimer > 0
    && player.attackCooldown <= profile.queueWindowMs;
}

export function getSlashColor(profile) {
  if (profile.type === "downslash") {
    return PLAYER_COMBAT_CONFIG.slashColors.pogo;
  }
  if (profile.finisher) {
    return PLAYER_COMBAT_CONFIG.slashColors.finisher;
  }
  if (profile.hitTag === "heavy") {
    return PLAYER_COMBAT_CONFIG.slashColors.heavy;
  }
  return PLAYER_COMBAT_CONFIG.slashColors.normal;
}
