# Step 5: Wall Slide and Wall Jump

`PlayerMovement.cs` now includes:

- Wall detection
- Wall slide
- Wall jump
- Optional ability gating with `AbilityType.WallJump`

Recommended inspector values:

- Wall Jump Unlocked By Default: `true`
- Wall Check Offset: `(0.45, 0)`
- Wall Check Size: `(0.2, 0.9)`
- Wall Slide Speed: `2`
- Wall Jump Force: `(8, 13)`
- Wall Jump Lock Time: `0.15`

Unity setup:

1. In `PlayerMovement`, set `Wall Layers` to include `Ground`
2. Leave `Wall Check Offset` at about `(0.45, 0)`
3. The script mirrors that offset automatically based on facing direction

Quick tests:

1. Jump against a vertical wall and fall while holding into it
2. The player should slide downward more slowly
3. Press jump while sliding on the wall
4. The player should push away from the wall and upward

Next step:

Step 6 adds camera follow.
