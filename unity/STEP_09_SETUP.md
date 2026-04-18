# Step 9: Simple Enemy

This step adds:

- A patrolling enemy
- Shared `Health`
- Contact damage against the player

Files:

- `Assets/_Project/Enemies/EnemyPatrol.cs`
- `Assets/_Project/Enemies/EnemyContactDamage.cs`

Recommended enemy setup:

1. Create `Enemy_Scout`
2. Add:
   - `Rigidbody2D`
   - `BoxCollider2D`
   - `Health`
   - `EnemyPatrol`
   - `EnemyContactDamage`
3. Set tag to `Enemy`
4. Set layer to `Enemy`
5. Add a child `Visuals`
6. Add a child `PatrolLeft`
7. Add a child `PatrolRight`

Recommended values:

- Move Speed: `2`
- Point Reach Distance: `0.1`
- Max Health: `3`
- Invulnerability Duration: `0.1`
- Damage Amount: `1`
- Hit Cooldown: `0.4`

Assign:

- `EnemyPatrol > Visuals Root` = `Visuals`
- `EnemyPatrol > Left Point` = `PatrolLeft`
- `EnemyPatrol > Right Point` = `PatrolRight`
- `EnemyContactDamage > Target Layers` = `Player`

Recommended Rigidbody2D values:

- Body Type: `Dynamic`
- Gravity Scale: `3`
- Freeze Rotation Z: enabled
- Collision Detection: `Continuous`

Next step:

Step 10 adds the Shadow Swap framework.
