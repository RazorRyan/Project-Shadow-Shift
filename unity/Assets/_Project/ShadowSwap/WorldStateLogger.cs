using UnityEngine;

namespace ShadowShift.ShadowSwap
{
    public class WorldStateLogger : MonoBehaviour
    {
        [SerializeField] private bool logOnEnable = true;

        private void OnEnable()
        {
            if (Core.GameContext.Instance == null)
            {
                return;
            }

            Core.GameContext.Instance.WorldChanged += HandleWorldChanged;

            if (logOnEnable)
            {
                HandleWorldChanged(Core.GameContext.Instance.CurrentWorld);
            }
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
            Debug.Log($"Active World: {worldType}", this);
        }
    }
}
