using UnityEngine;
using ShadowShift.Combat;

namespace ShadowShift.Elements
{
    public class BurnableBarrier : MonoBehaviour, IDamageable
    {
        [SerializeField] private bool requireFireElement = true;
        [SerializeField] private bool destroyOnBurn = true;
        [SerializeField] private GameObject burnedStateObject;

        private bool isBurned;

        public bool TakeDamage(DamageInfo damageInfo)
        {
            if (isBurned)
            {
                return false;
            }

            if (requireFireElement && damageInfo.Element != ElementType.Fire)
            {
                return false;
            }

            Burn();
            return true;
        }

        private void Burn()
        {
            isBurned = true;

            if (burnedStateObject != null)
            {
                burnedStateObject.SetActive(true);
            }

            if (destroyOnBurn)
            {
                Destroy(gameObject);
                return;
            }

            gameObject.SetActive(false);
        }
    }
}
