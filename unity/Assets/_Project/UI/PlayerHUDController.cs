using UnityEngine;
using UnityEngine.UI;
using ShadowShift.Combat;
using ShadowShift.Core;
using ShadowShift.Weapons;

namespace ShadowShift.UI
{
    public class PlayerHUDController : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Health playerHealth;
        [SerializeField] private PlayerWeaponController playerWeaponController;
        [SerializeField] private Image healthFillImage;
        [SerializeField] private Text healthText;
        [SerializeField] private Text worldText;
        [SerializeField] private Text elementText;
        [SerializeField] private Text weaponText;

        private void OnEnable()
        {
            if (playerHealth != null)
            {
                playerHealth.HealthChanged += HandleHealthChanged;
                HandleHealthChanged(playerHealth.CurrentHealth, playerHealth.MaxHealth);
            }

            if (GameContext.Instance != null)
            {
                GameContext.Instance.WorldChanged += HandleWorldChanged;
                GameContext.Instance.ElementChanged += HandleElementChanged;
                HandleWorldChanged(GameContext.Instance.CurrentWorld);
                HandleElementChanged(GameContext.Instance.CurrentElement);
            }

            if (playerWeaponController != null)
            {
                playerWeaponController.WeaponStageChanged += HandleWeaponStageChanged;

                if (playerWeaponController.CurrentStage != null)
                {
                    HandleWeaponStageChanged(playerWeaponController.CurrentStage, playerWeaponController.CurrentStageIndex);
                }
            }
        }

        private void OnDisable()
        {
            if (playerHealth != null)
            {
                playerHealth.HealthChanged -= HandleHealthChanged;
            }

            if (GameContext.Instance != null)
            {
                GameContext.Instance.WorldChanged -= HandleWorldChanged;
                GameContext.Instance.ElementChanged -= HandleElementChanged;
            }

            if (playerWeaponController != null)
            {
                playerWeaponController.WeaponStageChanged -= HandleWeaponStageChanged;
            }
        }

        private void HandleHealthChanged(int currentHealth, int maxHealth)
        {
            if (healthFillImage != null)
            {
                healthFillImage.fillAmount = maxHealth <= 0 ? 0f : (float)currentHealth / maxHealth;
            }

            if (healthText != null)
            {
                healthText.text = $"HP {currentHealth}/{maxHealth}";
            }
        }

        private void HandleWorldChanged(ShadowSwap.WorldType worldType)
        {
            if (worldText != null)
            {
                worldText.text = $"World: {worldType}";
            }
        }

        private void HandleElementChanged(Elements.ElementType elementType)
        {
            if (elementText != null)
            {
                elementText.text = $"Element: {elementType}";
            }
        }

        private void HandleWeaponStageChanged(WeaponAttackStage stage, int stageIndex)
        {
            if (weaponText != null && playerWeaponController != null && playerWeaponController.WeaponDefinition != null)
            {
                weaponText.text = $"Weapon: {playerWeaponController.WeaponDefinition.weaponName} {stageIndex + 1}";
            }
        }
    }
}
