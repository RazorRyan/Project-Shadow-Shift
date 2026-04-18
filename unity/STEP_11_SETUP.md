# Step 11: World-Swappable Objects

This step adds generic world-swappable object behaviour.

Files:

- `Assets/_Project/ShadowSwap/WorldPresenceMode.cs`
- `Assets/_Project/ShadowSwap/WorldSwapVisibility.cs`
- `Assets/_Project/ShadowSwap/WorldSwapGhostTint.cs`

What it does:

- Lets any object exist in `Light`, `Shadow`, or `Both`
- Can disable colliders when the object is inactive in the current world
- Can optionally hide sprites completely
- Can also show a faint ghosted sprite when inactive

Recommended first use:

1. Create a small platform named `ShadowPlatform`
2. Add:
   - `SpriteRenderer`
   - `BoxCollider2D`
   - `WorldSwapVisibility`
3. Set `Presence Mode` to `ShadowOnly`
4. Leave `Disable Renderers When Inactive` enabled
5. Leave `Disable Colliders When Inactive` enabled

Optional visual clarity:

1. Add `WorldSwapGhostTint` to the same object
2. Set `Presence Mode` to match `WorldSwapVisibility`
3. Use a low alpha inactive color such as `0.2`
4. If using ghost tint, disable `Disable Renderers When Inactive`

Vertical slice test idea:

- Place a gap in your room
- Add a `ShadowOnly` platform over it
- Swap to `Shadow` to reveal and stand on it
- Swap back to `Light` to make it disappear

Next step:

Step 12 adds the Element Shift framework.
