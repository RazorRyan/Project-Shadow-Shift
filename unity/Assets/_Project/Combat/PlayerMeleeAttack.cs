using UnityEngine;
using ShadowShift.Player;

namespace ShadowShift.Combat
{
    [RequireComponent(typeof(MeleeAttack))]
    public class PlayerMeleeAttack : MonoBehaviour
    {
        [SerializeField] private PlayerMovement playerMovement;
        [SerializeField] private Transform attackVisualRoot;

        private void LateUpdate()
        {
            if (playerMovement == null || attackVisualRoot == null)
            {
                return;
            }

            Vector3 scale = attackVisualRoot.localScale;
            scale.x = Mathf.Abs(scale.x) * playerMovement.FacingDirectionSign();
            attackVisualRoot.localScale = scale;
        }
    }
}
