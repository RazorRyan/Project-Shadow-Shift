using UnityEngine;
using ShadowShift.Combat;

namespace ShadowShift.Enemies
{
    [RequireComponent(typeof(Collider2D))]
    public class EnemyContactDamage : MonoBehaviour
    {
        [SerializeField] private int damageAmount = 1;
        [SerializeField] private LayerMask targetLayers;
        [SerializeField] private float hitCooldown = 0.4f;

        private float cooldownTimer;

        private void Update()
        {
            if (cooldownTimer > 0f)
            {
                cooldownTimer -= Time.deltaTime;
            }
        }

        private void OnCollisionStay2D(Collision2D collision)
        {
            if (cooldownTimer > 0f)
            {
                return;
            }

            if (!IsInLayerMask(collision.gameObject.layer, targetLayers))
            {
                return;
            }

            IDamageable damageable = collision.gameObject.GetComponentInParent<IDamageable>();

            if (damageable == null)
            {
                return;
            }

            Vector2 hitPoint = collision.GetContact(0).point;
            bool applied = damageable.TakeDamage(new DamageInfo(damageAmount, gameObject, hitPoint));

            if (applied)
            {
                cooldownTimer = hitCooldown;
            }
        }

        private static bool IsInLayerMask(int layer, LayerMask mask)
        {
            return (mask.value & (1 << layer)) != 0;
        }
    }
}
