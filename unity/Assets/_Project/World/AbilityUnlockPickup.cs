using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.World
{
    [RequireComponent(typeof(Collider2D))]
    public class AbilityUnlockPickup : MonoBehaviour
    {
        [SerializeField] private AbilityType abilityToUnlock = AbilityType.Dash;
        [SerializeField] private LayerMask targetLayers;
        [SerializeField] private bool destroyAfterPickup = true;

        private void Awake()
        {
            Collider2D trigger = GetComponent<Collider2D>();
            trigger.isTrigger = true;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!IsInLayerMask(other.gameObject.layer, targetLayers) || GameContext.Instance == null)
            {
                return;
            }

            GameContext.Instance.UnlockAbility(abilityToUnlock);

            if (destroyAfterPickup)
            {
                Destroy(gameObject);
            }
        }

        private static bool IsInLayerMask(int layer, LayerMask mask)
        {
            return (mask.value & (1 << layer)) != 0;
        }
    }
}
