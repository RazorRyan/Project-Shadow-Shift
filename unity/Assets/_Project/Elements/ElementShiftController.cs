using UnityEngine;
using ShadowShift.Core;

namespace ShadowShift.Elements
{
    public class ElementShiftController : MonoBehaviour
    {
        [Header("Input")]
        [SerializeField] private KeyCode fireKey = KeyCode.Alpha1;
        [SerializeField] private KeyCode iceKey = KeyCode.Alpha2;
        [SerializeField] private KeyCode windKey = KeyCode.Alpha3;
        [SerializeField] private KeyCode clearKey = KeyCode.Alpha0;

        [Header("Unlock")]
        [SerializeField] private bool fireUnlockedByDefault = true;
        [SerializeField] private bool iceUnlockedByDefault = true;
        [SerializeField] private bool windUnlockedByDefault = true;

        private void Update()
        {
            if (Input.GetKeyDown(clearKey))
            {
                TrySetElement(ElementType.None);
                return;
            }

            if (Input.GetKeyDown(fireKey))
            {
                TrySetElement(ElementType.Fire);
                return;
            }

            if (Input.GetKeyDown(iceKey))
            {
                TrySetElement(ElementType.Ice);
                return;
            }

            if (Input.GetKeyDown(windKey))
            {
                TrySetElement(ElementType.Wind);
            }
        }

        public bool TrySetElement(ElementType elementType)
        {
            if (GameContext.Instance == null)
            {
                return false;
            }

            if (!CanUseElement(elementType))
            {
                return false;
            }

            GameContext.Instance.SetElement(elementType);
            return true;
        }

        private bool CanUseElement(ElementType elementType)
        {
            switch (elementType)
            {
                case ElementType.None:
                    return true;
                case ElementType.Fire:
                    return fireUnlockedByDefault || GameContext.Instance.HasAbility(AbilityType.FireShift);
                case ElementType.Ice:
                    return iceUnlockedByDefault || GameContext.Instance.HasAbility(AbilityType.IceShift);
                case ElementType.Wind:
                    return windUnlockedByDefault || GameContext.Instance.HasAbility(AbilityType.WindShift);
                default:
                    return false;
            }
        }
    }
}
