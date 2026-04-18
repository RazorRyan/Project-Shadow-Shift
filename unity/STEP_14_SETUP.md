# Step 14: Weapon Evolution Framework

This step adds a data-driven weapon framework for the player's melee weapon.

Files:

- `Assets/_Project/Weapons/WeaponAttackStage.cs`
- `Assets/_Project/Weapons/WeaponDefinition.cs`
- `Assets/_Project/Weapons/PlayerWeaponController.cs`

Recommended setup:

1. Create a `WeaponDefinition` asset
2. Add at least two stages:
   - Stage 0: base attack
   - Stage 1: stronger or wider attack
3. Add `PlayerWeaponController` to the player
4. Assign the `WeaponDefinition`

Suggested stage values:

- Stage 0:
  - Damage `1`
  - Cooldown `0.25`
  - Offset `(0.8, 0)`
  - Size `(1.1, 0.9)`
- Stage 1:
  - Damage `2`
  - Cooldown `0.22`
  - Offset `(0.95, 0)`
  - Size `(1.3, 1.0)`

Next step:

Step 15 adds simple UI for health, world, element, and weapon stage.
