# Step 8: Basic Melee Combat

This step adds a simple forward melee hitbox for the player.

Files:

- `Assets/_Project/Combat/MeleeAttack.cs`
- `Assets/_Project/Combat/PlayerMeleeAttack.cs`

Input:

- Attack: `J`

Recommended setup:

1. Add `MeleeAttack` to the `Player`
2. Add `PlayerMeleeAttack` to the `Player`
3. Assign `PlayerMovement` to `PlayerMeleeAttack`
4. Assign `Visuals` to both:
   - `MeleeAttack > Attack Origin`
   - `PlayerMeleeAttack > Attack Visual Root`
5. Set `Target Layers` to `Enemy`

Recommended values:

- Attack Offset: `(0.8, 0)`
- Attack Size: `(1.1, 0.9)`
- Damage Amount: `1`
- Attack Cooldown: `0.25`

Quick test setup:

1. Create a dummy target object
2. Add `BoxCollider2D`
3. Add `Health`
4. Put it on the `Enemy` layer
5. Press `J` while standing next to it

Next step:

Step 9 adds a simple enemy with patrol and contact damage.
