# Step 2: Player GameObject and Basic Movement

This step adds the first player controller script:

- `Assets/_Project/Player/PlayerMovement.cs`

What it does:

- Reads left/right input with the legacy `Horizontal` axis
- Moves a `Rigidbody2D` smoothly
- Tracks grounded state with an overlap box
- Flips the visual child to face movement direction

Unity editor setup needed:

1. Create a `Player` GameObject in `Bootstrap.unity`
2. Add:
   - `SpriteRenderer`
   - `Rigidbody2D`
   - `CapsuleCollider2D`
   - `PlayerMovement`
3. Create a child named `Visuals`
4. Move the `SpriteRenderer` to `Visuals` or keep it on the root and assign the root as `Visuals Root`
5. Create a child named `GroundCheck`
6. Place `GroundCheck` near the player's feet
7. Assign:
   - `Visuals Root`
   - `Ground Check Point`
8. Set the player object to the `Player` layer and tag `Player`
9. Put ground colliders on the `Ground` layer

Recommended Rigidbody2D values:

- Body Type: Dynamic
- Gravity Scale: `3`
- Collision Detection: Continuous
- Interpolate: Interpolate
- Freeze Rotation Z: enabled

Recommended starting movement values:

- Max Run Speed: `8`
- Ground Acceleration: `60`
- Ground Deceleration: `75`
- Air Acceleration Multiplier: `0.65`
- Ground Check Size: `(0.6, 0.15)`

Next step:

Step 3 adds jump input, jump force, coyote time, and jump buffering on top of this controller.
