using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.World
{
    public class AbilityGate : MonoBehaviour
    {
        [SerializeField] private AbilityType requiredAbility = AbilityType.ShadowSwap;
        [SerializeField] private bool invertRequirement;
        [SerializeField] private Renderer[] targetRenderers;
        [SerializeField] private Collider2D[] targetColliders2D;

        private void Awake()
        {
            if (targetRenderers == null || targetRenderers.Length == 0)
            {
                targetRenderers = GetComponentsInChildren<Renderer>(true);
            }

            if (targetColliders2D == null || targetColliders2D.Length == 0)
            {
                targetColliders2D = GetComponentsInChildren<Collider2D>(true);
            }
        }

        private void OnEnable()
        {
            if (GameContext.Instance == null)
            {
                return;
            }

            GameContext.Instance.AbilityUnlocked += HandleAbilityUnlocked;
            ApplyState();
        }

        private void OnDisable()
        {
            if (GameContext.Instance == null)
            {
                return;
            }

            GameContext.Instance.AbilityUnlocked -= HandleAbilityUnlocked;
        }

        private void HandleAbilityUnlocked(AbilityType _)
        {
            ApplyState();
        }

        private void ApplyState()
        {
            if (GameContext.Instance == null)
            {
                return;
            }

            bool hasAbility = GameContext.Instance.HasAbility(requiredAbility);
            bool gateActive = invertRequirement ? hasAbility : !hasAbility;

            for (int i = 0; i < targetRenderers.Length; i++)
            {
                if (targetRenderers[i] != null)
                {
                    targetRenderers[i].enabled = gateActive;
                }
            }

            for (int i = 0; i < targetColliders2D.Length; i++)
            {
                if (targetColliders2D[i] != null)
                {
                    targetColliders2D[i].enabled = gateActive;
                }
            }
        }
    }
}
