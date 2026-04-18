# Step 12: Element Shift Framework

This step adds the first Element Shift framework:

- Input for `Fire`, `Ice`, `Wind`, and `None`
- Ability-gate support through `GameContext`
- Simple visual feedback through sprite tinting
- Optional debug logging

Files:

- `Assets/_Project/Elements/ElementShiftController.cs`
- `Assets/_Project/Elements/ElementStateSpriteTint.cs`
- `Assets/_Project/Elements/ElementStateLogger.cs`

Input:

- Clear element: `0`
- Fire: `1`
- Ice: `2`
- Wind: `3`

Recommended setup:

1. Add `ElementShiftController` to the `Player`
2. Leave the unlock booleans enabled for now
3. Add `ElementStateSpriteTint` to the player's `Visuals` object
4. Optionally add `ElementStateLogger` to `GameContext`

Recommended colors:

- None: white
- Fire: warm orange-red
- Ice: cool cyan-blue
- Wind: pale green

If you want progression gating later:

- Turn the relevant `...UnlockedByDefault` option off
- Add the matching ability to `DefaultGameState.startingAbilities`

Next step:

Step 13 adds one real elemental interaction, starting with Fire.
