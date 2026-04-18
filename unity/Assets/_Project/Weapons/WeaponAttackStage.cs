using System;
using UnityEngine;

namespace ShadowShift.Weapons
{
    [Serializable]
    public class WeaponAttackStage
    {
        public string stageName = "Base";
        public int damage = 1;
        public float attackCooldown = 0.25f;
        public Vector2 attackOffset = new Vector2(0.8f, 0f);
        public Vector2 attackSize = new Vector2(1.1f, 0.9f);
    }
}
