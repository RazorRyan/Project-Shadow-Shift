using System;
using UnityEngine;

namespace ShadowShift.Combat
{
    public class Health : MonoBehaviour, IDamageable
    {
        [Header("Health")]
        [SerializeField] private int maxHealth = 5;
        [SerializeField] private bool resetHealthOnEnable = true;

        [Header("Damage")]
        [SerializeField] private float invulnerabilityDuration = 0.2f;
        [SerializeField] private bool destroyOnDeath;

        private float invulnerabilityTimer;

        public int MaxHealth => maxHealth;
        public int CurrentHealth { get; private set; }
        public bool IsDead { get; private set; }

        public event Action<int, int> HealthChanged;
        public event Action<DamageInfo> Damaged;
        public event Action Died;

        private void OnEnable()
        {
            if (resetHealthOnEnable)
            {
                ResetHealth();
            }
        }

        private void Update()
        {
            if (invulnerabilityTimer > 0f)
            {
                invulnerabilityTimer -= Time.deltaTime;
            }
        }

        public bool TakeDamage(DamageInfo damageInfo)
        {
            if (IsDead || damageInfo.Amount <= 0 || invulnerabilityTimer > 0f)
            {
                return false;
            }

            CurrentHealth = Mathf.Max(0, CurrentHealth - damageInfo.Amount);
            invulnerabilityTimer = invulnerabilityDuration;

            HealthChanged?.Invoke(CurrentHealth, MaxHealth);
            Damaged?.Invoke(damageInfo);

            if (CurrentHealth == 0)
            {
                Die();
            }

            return true;
        }

        public void Heal(int amount)
        {
            if (IsDead || amount <= 0)
            {
                return;
            }

            CurrentHealth = Mathf.Min(MaxHealth, CurrentHealth + amount);
            HealthChanged?.Invoke(CurrentHealth, MaxHealth);
        }

        public void ResetHealth()
        {
            IsDead = false;
            CurrentHealth = MaxHealth;
            invulnerabilityTimer = 0f;
            HealthChanged?.Invoke(CurrentHealth, MaxHealth);
        }

        private void Die()
        {
            if (IsDead)
            {
                return;
            }

            IsDead = true;
            Died?.Invoke();

            if (destroyOnDeath)
            {
                Destroy(gameObject);
            }
        }
    }
}
