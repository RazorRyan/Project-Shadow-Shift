using UnityEngine;

namespace ShadowShift.Elements
{
    public class ElementStateLogger : MonoBehaviour
    {
        [SerializeField] private bool logOnEnable = true;

        private void OnEnable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.ElementChanged += HandleElementChanged;

            if (logOnEnable)
            {
                HandleElementChanged(Core.GameContext.Instance.CurrentElement);
            }
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
            Debug.Log($"Active Element: {elementType}", this);
        }
    }
}
