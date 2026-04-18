using UnityEngine;
using ShadowShift.UI;

namespace ShadowShift.ShadowSwap
{
    [RequireComponent(typeof(SpriteRenderer))]
    [RequireComponent(typeof(SpriteTintStack))]
    public class WorldStateSpriteTint : MonoBehaviour
    {
        [SerializeField] private Color lightWorldColor = Color.white;
        [SerializeField] private Color shadowWorldColor = new Color(0.55f, 0.6f, 0.85f, 1f);

        private SpriteTintStack tintStack;

        private void Awake()
        {
            tintStack = GetComponent<SpriteTintStack>();
        }

        private void OnEnable()
        {
            if (GameContextSafe() != null)
            {
                GameContextSafe().WorldChanged += HandleWorldChanged;
                ApplyWorld(GameContextSafe().CurrentWorld);
            }
        }

        private void OnDisable()
        {
            if (GameContextSafe() != null)
            {
                GameContextSafe().WorldChanged -= HandleWorldChanged;
            }
        }

        private void HandleWorldChanged(WorldType worldType)
        {
            ApplyWorld(worldType);
        }

        private void ApplyWorld(WorldType worldType)
        {
            if (tintStack == null)
            {
                return;
            }

            tintStack.SetWorldTint(worldType == WorldType.Light ? lightWorldColor : shadowWorldColor);
        }

        private static Core.GameContext GameContextSafe()
        {
            return Core.GameContext.Instance;
        }
    }
}
