using UnityEngine;

namespace ShadowShift.ShadowSwap
{
    [RequireComponent(typeof(SpriteRenderer))]
    public class WorldSwapGhostTint : MonoBehaviour
    {
        [SerializeField] private WorldPresenceMode presenceMode = WorldPresenceMode.LightOnly;
        [SerializeField] private Color activeColor = Color.white;
        [SerializeField] private Color inactiveGhostColor = new Color(1f, 1f, 1f, 0.2f);

        private SpriteRenderer spriteRenderer;

        private void Awake()
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
        }

        private void OnEnable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.WorldChanged += HandleWorldChanged;
            ApplyTint(Core.GameContext.Instance.CurrentWorld);
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
            ApplyTint(worldType);
        }

        private void ApplyTint(WorldType worldType)
        {
            if (spriteRenderer == null)
            {
                return;
            }

            bool active = IsActiveInWorld(worldType);
            spriteRenderer.color = active ? activeColor : inactiveGhostColor;
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
    }
}
