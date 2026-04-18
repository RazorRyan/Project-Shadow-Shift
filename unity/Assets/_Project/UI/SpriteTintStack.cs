using UnityEngine;

namespace ShadowShift.UI
{
    [RequireComponent(typeof(SpriteRenderer))]
    public class SpriteTintStack : MonoBehaviour
    {
        private SpriteRenderer spriteRenderer;
        private Color baseColor = Color.white;
        private Color worldTint = Color.white;
        private Color elementTint = Color.white;

        private void Awake()
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
            baseColor = spriteRenderer.color;
            Apply();
        }

        public void SetWorldTint(Color color)
        {
            worldTint = color;
            Apply();
        }

        public void SetElementTint(Color color)
        {
            elementTint = color;
            Apply();
        }

        private void Apply()
        {
            if (spriteRenderer == null)
            {
                return;
            }

            spriteRenderer.color = Multiply(baseColor, Multiply(worldTint, elementTint));
        }

        private static Color Multiply(Color a, Color b)
        {
            return new Color(a.r * b.r, a.g * b.g, a.b * b.b, a.a * b.a);
        }
    }
}
