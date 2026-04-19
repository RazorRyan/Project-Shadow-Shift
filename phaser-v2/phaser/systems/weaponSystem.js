import { WEAPON_STAGES } from "../data/weaponData.js";

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

    onUpgrade(cb) { listeners.push(cb); },
  };
}
