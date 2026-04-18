using UnityEngine;
using ShadowShift.Weapons;

namespace ShadowShift.World
{
    [RequireComponent(typeof(Collider2D))]
    public class WeaponUpgradePickup : MonoBehaviour
    {
        [SerializeField] private PlayerWeaponController playerWeaponController;
        [SerializeField] private LayerMask targetLayers;
        [SerializeField] private bool destroyAfterPickup = true;

        private void Awake()
        {
            Collider2D trigger = GetComponent<Collider2D>();
            trigger.isTrigger = true;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!IsInLayerMask(other.gameObject.layer, targetLayers))
            {
                return;
            }

            if (playerWeaponController == null)
            {
                playerWeaponController = other.GetComponentInParent<PlayerWeaponController>();
            }

            if (playerWeaponController == null)
            {
                return;
            }

            bool upgraded = playerWeaponController.UpgradeToNextStage();

            if (upgraded && destroyAfterPickup)
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
