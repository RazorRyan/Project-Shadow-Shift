# Step 7: Health and Damage System

This step adds a reusable health and damage foundation.

Files:

- `Assets/_Project/Combat/DamageInfo.cs`
- `Assets/_Project/Combat/IDamageable.cs`
- `Assets/_Project/Combat/Health.cs`
- `Assets/_Project/Combat/DamageOnTrigger2D.cs`

What it does:

- `Health` stores max/current health
- `Health` can take damage, heal, reset, and die
- `DamageOnTrigger2D` applies damage through a trigger collider
- Both player and enemies can use the same `Health` component later

Recommended first test:

1. Add `Health` to the `Player`
2. Set `Max Health` to `5`
3. Create a simple spike object with:
   - `BoxCollider2D`
   - `DamageOnTrigger2D`
4. Turn on `Is Trigger` for the collider
5. Put the spike on the `Hazard` layer
6. Set `Target Layers` on `DamageOnTrigger2D` to include `Player`
7. Run into the spike

Recommended values:

- Player `Max Health`: `5`
- Player `Invulnerability Duration`: `0.4`
- Hazard `Damage Amount`: `1`

Next step:

Step 8 adds melee combat.
