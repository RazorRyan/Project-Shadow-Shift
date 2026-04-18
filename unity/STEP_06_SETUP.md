# Step 6: Camera Follow

This step adds a simple smooth 2D camera follow.

Files:

- `Assets/_Project/Core/Runtime/FollowTargetProvider.cs`
- `Assets/_Project/Systems/CameraFollow2D.cs`

Recommended setup:

1. Add `FollowTargetProvider` to `GameContext`
2. Drag the `Player` transform into its `Follow Target` field
3. Add `CameraFollow2D` to `Main Camera`
4. Assign `GameContext` to the `Target Provider` field

Recommended camera values:

- Offset: `(0, 1, -10)`
- Smooth Time: `0.15`
- Follow X: `true`
- Follow Y: `true`

If you prefer, you can skip the provider and assign the player directly to `Target`.

Next step:

Step 7 adds a reusable health and damage system.
