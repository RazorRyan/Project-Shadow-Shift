using System;
using System.Collections.Generic;
using UnityEngine;
using ShadowShift.Data;
using ShadowShift.Elements;
using ShadowShift.ShadowSwap;

namespace ShadowShift.Core
{
    public class GameContext : MonoBehaviour
    {
        public static GameContext Instance { get; private set; }

        [SerializeField] private GameStateDefinition initialState;

        private readonly HashSet<AbilityType> unlockedAbilities = new HashSet<AbilityType>();

        public WorldType CurrentWorld { get; private set; }
        public ElementType CurrentElement { get; private set; }

        public event Action<WorldType> WorldChanged;
        public event Action<ElementType> ElementChanged;
        public event Action<AbilityType> AbilityUnlocked;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeFromDefinition();
        }

        private void InitializeFromDefinition()
        {
            unlockedAbilities.Clear();

            if (initialState == null)
            {
                CurrentWorld = WorldType.Light;
                CurrentElement = ElementType.None;
                return;
            }

            CurrentWorld = initialState.startingWorld;
            CurrentElement = initialState.startingElement;

            for (int i = 0; i < initialState.startingAbilities.Count; i++)
            {
                unlockedAbilities.Add(initialState.startingAbilities[i]);
            }
        }

        public bool HasAbility(AbilityType ability)
        {
            return unlockedAbilities.Contains(ability);
        }

        public void UnlockAbility(AbilityType ability)
        {
            if (unlockedAbilities.Add(ability))
            {
                AbilityUnlocked?.Invoke(ability);
            }
        }

        public void SetWorld(WorldType newWorld)
        {
            if (CurrentWorld == newWorld)
            {
                return;
            }

            CurrentWorld = newWorld;
            WorldChanged?.Invoke(CurrentWorld);
        }

        public void ToggleWorld()
        {
            SetWorld(CurrentWorld == WorldType.Light ? WorldType.Shadow : WorldType.Light);
        }

        public void SetElement(ElementType newElement)
        {
            if (CurrentElement == newElement)
            {
                return;
            }

            CurrentElement = newElement;
            ElementChanged?.Invoke(CurrentElement);
        }
    }
}
