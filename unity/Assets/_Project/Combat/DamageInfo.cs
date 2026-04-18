using UnityEngine;
using ShadowShift.Elements;

namespace ShadowShift.Combat
{
    public struct DamageInfo
    {
        public int Amount { get; }
        public GameObject Source { get; }
        public Vector2 HitPoint { get; }
        public ElementType Element { get; }

        public DamageInfo(int amount, GameObject source, Vector2 hitPoint, ElementType element = ElementType.None)
        {
            Amount = amount;
            Source = source;
            HitPoint = hitPoint;
            Element = element;
        }
    }
}
