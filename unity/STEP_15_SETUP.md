# Step 15: Simple UI

This step adds a lightweight HUD.

Files:

- `Assets/_Project/UI/PlayerHUDController.cs`

Recommended canvas setup:

1. Create a `Canvas`
2. Add:
   - one `Image` for health fill
   - one `Text` for HP
   - one `Text` for world
   - one `Text` for element
   - one `Text` for weapon
3. Add `PlayerHUDController` to a HUD root object
4. Assign the player `Health`
5. Assign the player `PlayerWeaponController`
6. Assign the UI references

Next step:

Step 16 builds the small vertical slice room chain with pickups and a gate.
