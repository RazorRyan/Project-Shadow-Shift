using UnityEngine;
using ShadowShift.Core;
using ShadowShift.Elements;
using System.Collections.Generic;

namespace ShadowShift.Combat
{
    public class MeleeAttack : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform attackOrigin;

        [Header("Attack")]
        [SerializeField] private Vector2 attackOffset = new Vector2(0.8f, 0f);
        [SerializeField] private Vector2 attackSize = new Vector2(1.1f, 0.9f);
        [SerializeField] private LayerMask targetLayers;
        [SerializeField] private int damageAmount = 1;
        [SerializeField] private float attackCooldown = 0.25f;

        private float cooldownTimer;

        public bool IsAttacking { get; private set; }

        private void Update()
        {
            if (cooldownTimer > 0f)
            {
                cooldownTimer -= Time.deltaTime;
            }

            if (Input.GetKeyDown(KeyCode.J))
            {
                TryAttack();
            }
        }

        public bool TryAttack()
        {
            if (cooldownTimer > 0f)
            {
                return false;
            }

            PerformAttack();
            cooldownTimer = attackCooldown;
            return true;
        }

        private void PerformAttack()
        {
            IsAttacking = true;

            Vector2 center = GetAttackCenter();
            Collider2D[] hits = Physics2D.OverlapBoxAll(center, attackSize, 0f, targetLayers);
            HashSet<IDamageable> damagedTargets = new HashSet<IDamageable>();

            for (int i = 0; i < hits.Length; i++)
            {
                IDamageable damageable = hits[i].GetComponentInParent<IDamageable>();

                if (damageable == null || damagedTargets.Contains(damageable))
                {
                    continue;
                }

                Vector2 hitPoint = hits[i].bounds.ClosestPoint(center);
                damageable.TakeDamage(new DamageInfo(damageAmount, gameObject, hitPoint, GetCurrentElement()));
                damagedTargets.Add(damageable);
            }

            IsAttacking = false;
        }

        public void Configure(int newDamageAmount, float newAttackCooldown, Vector2 newAttackOffset, Vector2 newAttackSize)
        {
            damageAmount = newDamageAmount;
            attackCooldown = newAttackCooldown;
            attackOffset = newAttackOffset;
            attackSize = newAttackSize;
        }

        private Vector2 GetAttackCenter()
        {
            Transform origin = attackOrigin != null ? attackOrigin : transform;
            float facing = Mathf.Sign(origin.lossyScale.x);

            if (Mathf.Approximately(facing, 0f))
            {
                facing = 1f;
            }

            return (Vector2)origin.position + new Vector2(attackOffset.x * facing, attackOffset.y);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireCube(GetAttackCenter(), attackSize);
        }

        private static ElementType GetCurrentElement()
        {
            if (GameContext.Instance == null)
            {
                return ElementType.None;
            }

            return GameContext.Instance.CurrentElement;
        }
    }
}
