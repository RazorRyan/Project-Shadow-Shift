# Step 16: Vertical Slice Room Chain

This step adds helper scripts for progression and room gating.

Files:

- `Assets/_Project/World/AbilityUnlockPickup.cs`
- `Assets/_Project/World/AbilityGate.cs`
- `Assets/_Project/World/WeaponUpgradePickup.cs`

Suggested room chain:

1. Room A:
   - spawn point
   - enemy patrol
   - a low gate blocking a side route
2. Room B:
   - `AbilityUnlockPickup` that grants `ShadowSwap` or `FireShift`
3. Room C:
   - `BurnableBarrier`
   - `ShadowOnly` traversal platform
   - `WeaponUpgradePickup`

Recommended gate test:

1. Set player movement `Dash Unlocked By Default` to `false`
2. Add an `AbilityUnlockPickup` set to `Dash`
3. Place an `AbilityGate` before a corridor that needs dash or jump timing
4. After the pickup, the gate should open automatically

Next step:

Step 17 is the cleanup and integration pass.
