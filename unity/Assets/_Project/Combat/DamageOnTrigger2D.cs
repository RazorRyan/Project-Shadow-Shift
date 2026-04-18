using UnityEngine;

namespace ShadowShift.Combat
{
    [RequireComponent(typeof(Collider2D))]
    public class DamageOnTrigger2D : MonoBehaviour
    {
        [SerializeField] private int damageAmount = 1;
        [SerializeField] private LayerMask targetLayers;
        [SerializeField] private bool disableAfterHit;

        private Collider2D triggerCollider;

        private void Awake()
        {
            triggerCollider = GetComponent<Collider2D>();
            triggerCollider.isTrigger = true;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!IsInLayerMask(other.gameObject.layer, targetLayers))
            {
                return;
            }

            IDamageable damageable = other.GetComponentInParent<IDamageable>();

            if (damageable == null)
            {
                return;
            }

            Vector2 hitPoint = other.bounds.ClosestPoint(transform.position);
            bool applied = damageable.TakeDamage(new DamageInfo(damageAmount, gameObject, hitPoint));

            if (applied && disableAfterHit)
            {
                gameObject.SetActive(false);
            }
        }

        private static bool IsInLayerMask(int layer, LayerMask mask)
        {
            return (mask.value & (1 << layer)) != 0;
        }
    }
}
