using UnityEngine;
using ShadowShift.UI;

namespace ShadowShift.Elements
{
    [RequireComponent(typeof(SpriteRenderer))]
    [RequireComponent(typeof(SpriteTintStack))]
    public class ElementStateSpriteTint : MonoBehaviour
    {
        [SerializeField] private Color noneColor = Color.white;
        [SerializeField] private Color fireColor = new Color(1f, 0.55f, 0.4f, 1f);
        [SerializeField] private Color iceColor = new Color(0.55f, 0.85f, 1f, 1f);
        [SerializeField] private Color windColor = new Color(0.75f, 1f, 0.75f, 1f);

        private SpriteTintStack tintStack;

        private void Awake()
        {
            tintStack = GetComponent<SpriteTintStack>();
        }

        private void OnEnable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.ElementChanged += HandleElementChanged;
            ApplyElement(Core.GameContext.Instance.CurrentElement);
        }

        private void OnDisable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.ElementChanged -= HandleElementChanged;
        }

        private void HandleElementChanged(ElementType elementType)
        {
            ApplyElement(elementType);
        }

        private void ApplyElement(ElementType elementType)
        {
            if (tintStack == null)
            {
                return;
            }

            tintStack.SetElementTint(GetColorForElement(elementType));
        }

        private Color GetColorForElement(ElementType elementType)
        {
            switch (elementType)
            {
                case ElementType.Fire:
                    return fireColor;
                case ElementType.Ice:
                    return iceColor;
                case ElementType.Wind:
                    return windColor;
                case ElementType.None:
                default:
                    return noneColor;
            }
        }
    }
}
