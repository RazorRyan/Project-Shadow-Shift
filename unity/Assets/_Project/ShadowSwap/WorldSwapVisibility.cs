using UnityEngine;

namespace ShadowShift.ShadowSwap
{
    public class WorldSwapVisibility : MonoBehaviour
    {
        [Header("World Presence")]
        [SerializeField] private WorldPresenceMode presenceMode = WorldPresenceMode.Both;

        [Header("Behaviour")]
        [SerializeField] private bool disableRenderersWhenInactive = true;
        [SerializeField] private bool disableCollidersWhenInactive = true;
        [SerializeField] private Renderer[] targetRenderers;
        [SerializeField] private Collider2D[] targetColliders2D;

        private void Awake()
        {
            AutoAssignIfNeeded();
        }

        private void OnEnable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.WorldChanged += HandleWorldChanged;
            ApplyState(Core.GameContext.Instance.CurrentWorld);
        }

        private void OnDisable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.WorldChanged -= HandleWorldChanged;
        }

        private void HandleWorldChanged(WorldType worldType)
        {
            ApplyState(worldType);
        }

        private void ApplyState(WorldType worldType)
        {
            bool activeInCurrentWorld = IsActiveInWorld(worldType);

            if (disableRenderersWhenInactive)
            {
                for (int i = 0; i < targetRenderers.Length; i++)
                {
                    if (targetRenderers[i] != null)
                    {
                        targetRenderers[i].enabled = activeInCurrentWorld;
                    }
                }
            }

            if (disableCollidersWhenInactive)
            {
                for (int i = 0; i < targetColliders2D.Length; i++)
                {
                    if (targetColliders2D[i] != null)
                    {
                        targetColliders2D[i].enabled = activeInCurrentWorld;
                    }
                }
            }

        }

        private bool IsActiveInWorld(WorldType worldType)
        {
            switch (presenceMode)
            {
                case WorldPresenceMode.Both:
                    return true;
                case WorldPresenceMode.LightOnly:
                    return worldType == WorldType.Light;
                case WorldPresenceMode.ShadowOnly:
                    return worldType == WorldType.Shadow;
                default:
                    return true;
            }
        }

        private void AutoAssignIfNeeded()
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
    }
}
