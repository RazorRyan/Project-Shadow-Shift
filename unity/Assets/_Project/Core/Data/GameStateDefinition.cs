using System.Collections.Generic;
using UnityEngine;
using ShadowShift.Core;
using ShadowShift.Elements;
using ShadowShift.ShadowSwap;

namespace ShadowShift.Data
{
    [CreateAssetMenu(
        fileName = "GameStateDefinition",
        menuName = "Shadow Shift/Game State Definition")]
    public class GameStateDefinition : ScriptableObject
    {
        [Header("Starting State")]
        public WorldType startingWorld = WorldType.Light;
        public ElementType startingElement = ElementType.None;

        [Header("Unlocked Abilities At Start")]
        public List<AbilityType> startingAbilities = new List<AbilityType>();
    }
}
