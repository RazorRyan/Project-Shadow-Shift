using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.ShadowSwap
{
    public class ShadowSwapController : MonoBehaviour
    {
        [Header("Input")]
        [SerializeField] private KeyCode swapKey = KeyCode.Tab;

        [Header("Unlock")]
        [SerializeField] private bool unlockedByDefault = true;

        public bool CanSwap
        {
            get
            {
                if (unlockedByDefault)
                {
                    return true;
                }

                return GameContext.Instance != null && GameContext.Instance.HasAbility(AbilityType.ShadowSwap);
            }
        }

        private void Update()
        {
            if (!Input.GetKeyDown(swapKey))
            {
                return;
            }

            TrySwap();
        }

        public bool TrySwap()
        {
            if (!CanSwap || GameContext.Instance == null)
            {
                return false;
            }

            GameContext.Instance.ToggleWorld();
            return true;
        }
    }
}
