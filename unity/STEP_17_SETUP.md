# Step 17: Cleanup and Integration Pass

This step cleans up two important integration issues:

1. World tint and element tint now stack correctly on the same sprite
2. A single melee swing no longer damages the same target multiple times if it has multiple colliders

Files:

- `Assets/_Project/UI/SpriteTintStack.cs`
- `Assets/_Project/ShadowSwap/WorldStateSpriteTint.cs` updated
- `Assets/_Project/Elements/ElementStateSpriteTint.cs` updated
- `Assets/_Project/Combat/MeleeAttack.cs` updated

Important setup note:

- Because `WorldStateSpriteTint` and `ElementStateSpriteTint` now require `SpriteTintStack`, Unity will auto-add it when needed.

Final recommended vertical slice checklist:

1. Player:
   - movement
   - melee
   - shadow swap
   - element shift
   - health
   - weapon controller
2. Enemy:
   - patrol
   - contact damage
   - health
3. World:
   - one `ShadowOnly` platform
   - one `BurnableBarrier`
   - one `AbilityGate`
   - one `AbilityUnlockPickup`
   - one `WeaponUpgradePickup`
4. UI:
   - health
   - world
   - element
   - weapon stage
