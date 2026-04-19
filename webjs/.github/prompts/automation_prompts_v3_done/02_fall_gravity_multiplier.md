Status: DONE

# Phase 02: Fall Gravity Multiplier

Goal:

Apply a stronger downward gravity when the player is falling (vy > 0). This creates snappier, more satisfying jump arcs without affecting the jump ascent.

Scope:

- In `getPlayerGravity` (or wherever gravity is applied in `updatePlayer`), multiply gravity by ~1.55 when `player.vy > 0`
- This is a single tuning constant — expose it in `BASE_MOVEMENT_TUNING` as `fallGravityMultiplier`
- Do not change jump force, coyote time, wall jump, or any other movement parameter
- Do not touch enemy physics

Files:
- `webjs/game.js`
- `webjs/engine/movement.js` (for the tuning constant)

Completion Notes:
