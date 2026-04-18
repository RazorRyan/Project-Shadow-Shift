# Step 13: First Element Interaction

This step adds a real Fire interaction through combat.

Files:

- `Assets/_Project/Elements/BurnableBarrier.cs`
- `Assets/_Project/Combat/DamageInfo.cs` updated with `Element`

What it does:

- Player attacks now carry the current active element
- `BurnableBarrier` only reacts when hit with `Fire`

Recommended setup:

1. Create `BurnableBarrier` in the scene
2. Add:
   - `SpriteRenderer`
   - `BoxCollider2D`
   - `BurnableBarrier`
3. Place it on the path to block progress
4. Set `Destroy On Burn` enabled

How to test:

1. Press `0` and attack the barrier: nothing should happen
2. Press `1` for Fire and attack again: the barrier should burn away

Next step:

Step 14 adds the Weapon Evolution framework.
