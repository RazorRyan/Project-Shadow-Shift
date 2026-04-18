using System.Collections.Generic;
using UnityEngine;

namespace ShadowShift.Weapons
{
    [CreateAssetMenu(fileName = "WeaponDefinition", menuName = "Shadow Shift/Weapon Definition")]
    public class WeaponDefinition : ScriptableObject
    {
        public string weaponName = "Shard Blade";
        public List<WeaponAttackStage> stages = new List<WeaponAttackStage>();
    }
}
