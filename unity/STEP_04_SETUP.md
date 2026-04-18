# Step 4: Dash

`PlayerMovement.cs` now includes a simple horizontal dash.

Dash behavior:

- Input: `Left Shift` or `Right Shift`
- Uses facing direction if there is no movement input
- Temporarily removes gravity during the dash
- Has duration and cooldown
- Can optionally be gated behind `AbilityType.Dash`

Recommended inspector values:

- Dash Unlocked By Default: `true`
- Dash Speed: `16`
- Dash Duration: `0.14`
- Dash Cooldown: `0.35`

If you want to test progression gating later:

- Set `Dash Unlocked By Default` to `false`
- Add `Dash` to `DefaultGameState.startingAbilities`

Next step:

Step 5 adds wall slide and wall jump.
