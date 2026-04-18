# Step 10: Shadow Swap Framework

This step adds the first playable Shadow Swap framework:

- Input to toggle between `Light` and `Shadow`
- Ability-gate support through `GameContext`
- Simple visual response through sprite tinting
- Optional debug logging

Files:

- `Assets/_Project/ShadowSwap/ShadowSwapController.cs`
- `Assets/_Project/ShadowSwap/WorldStateSpriteTint.cs`
- `Assets/_Project/ShadowSwap/WorldStateLogger.cs`

Input:

- Swap world: `Tab`

Recommended setup:

1. Add `ShadowSwapController` to the `Player`
2. Leave `Unlocked By Default` enabled for now
3. Add `WorldStateSpriteTint` to the player's `Visuals` object
4. Optionally add `WorldStateLogger` to `GameContext`

Recommended tint values:

- Light World Color: white
- Shadow World Color: a cool blue-gray

If you want progression gating later:

- Set `Unlocked By Default` to `false`
- Add `ShadowSwap` to `DefaultGameState.startingAbilities`

Next step:

Step 11 adds world-swappable objects.
