using System;
using UnityEngine;
using ShadowShift.Combat;

namespace ShadowShift.Weapons
{
    [RequireComponent(typeof(MeleeAttack))]
    public class PlayerWeaponController : MonoBehaviour
    {
        [SerializeField] private WeaponDefinition weaponDefinition;
        [SerializeField] private int startingStageIndex;

        private MeleeAttack meleeAttack;

        public WeaponDefinition WeaponDefinition => weaponDefinition;
        public int CurrentStageIndex { get; private set; }
        public WeaponAttackStage CurrentStage => GetStage(CurrentStageIndex);

        public event Action<WeaponAttackStage, int> WeaponStageChanged;

        private void Awake()
        {
            meleeAttack = GetComponent<MeleeAttack>();
        }

        private void Start()
        {
            ApplyStage(startingStageIndex);
        }

        public bool UpgradeToNextStage()
        {
            return ApplyStage(CurrentStageIndex + 1);
        }

        public bool ApplyStage(int stageIndex)
        {
            WeaponAttackStage stage = GetStage(stageIndex);

            if (stage == null || meleeAttack == null)
            {
                return false;
            }

            CurrentStageIndex = stageIndex;
            meleeAttack.Configure(stage.damage, stage.attackCooldown, stage.attackOffset, stage.attackSize);
            WeaponStageChanged?.Invoke(stage, CurrentStageIndex);
            return true;
        }

        private WeaponAttackStage GetStage(int index)
        {
            if (weaponDefinition == null || weaponDefinition.stages == null)
            {
                return null;
            }

            if (index < 0 || index >= weaponDefinition.stages.Count)
            {
                return null;
            }

            return weaponDefinition.stages[index];
        }
    }
}
