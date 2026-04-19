import { WEAPON_STAGES } from "../data/weaponData.js";

function applyAttackTuning(profile, tuning = {}) {
  return {
    ...profile,
    damageBonus: (profile.damageBonus ?? 0) + (tuning.damageBonus ?? 0),
    width: (profile.width ?? 0) + (tuning.widthBonus ?? 0),
    height: (profile.height ?? 0) + (tuning.heightBonus ?? 0),
    attackTimeMs: Math.max(20, Math.round((profile.attackTimeMs ?? 0) * (tuning.attackTimeMultiplier ?? 1))),
    cooldownMs: Math.max(20, Math.round((profile.cooldownMs ?? 0) * (tuning.cooldownMultiplier ?? 1))),
    recoverMs: Math.max(0, Math.round((profile.recoverMs ?? 0) * (tuning.recoverMultiplier ?? 1))),
    forwardBoost: (profile.forwardBoost ?? 0) + (tuning.forwardBoostBonus ?? 0),
    knockback: (profile.knockback ?? 0) + (tuning.knockbackBonus ?? 0),
    bounceStrength: (profile.bounceStrength ?? 0) + (tuning.bounceStrengthBonus ?? 0),
  };
}

export function createWeaponSystem(initialStageIndex = 0) {
  let stageIndex = Math.max(0, Math.min(initialStageIndex, WEAPON_STAGES.length - 1));
  const listeners = [];

  return {
    getStage()       { return WEAPON_STAGES[stageIndex]; },
    getStageIndex()  { return stageIndex; },

    upgradeToNext() {
      if (stageIndex < WEAPON_STAGES.length - 1) {
        stageIndex++;
        listeners.forEach(cb => cb(WEAPON_STAGES[stageIndex]));
      }
    },

    applyDamage(baseDamage) {
      return Math.ceil(baseDamage * WEAPON_STAGES[stageIndex].damageMultiplier);
    },

    getRangeBonus() {
      return WEAPON_STAGES[stageIndex].rangeBonus;
    },

    resolveAttackProfile(profile) {
      const stage = WEAPON_STAGES[stageIndex];
      const byType = stage.attackTuning?.[profile.type] ?? null;
      const byId = stage.attackTuning?.[profile.id] ?? null;
      let resolved = { ...profile };
      if (byType) {
        resolved = applyAttackTuning(resolved, byType);
      }
      if (byId) {
        resolved = applyAttackTuning(resolved, byId);
      }
      return resolved;
    },

    onUpgrade(cb) { listeners.push(cb); },
  };
}
