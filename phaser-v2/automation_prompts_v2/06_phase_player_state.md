# 06 Phase Player State

## Goal
- Add modular player health, damage, invulnerability, and state handling needed for real encounters.

## Why this matters
- Combat and progression systems need stable player state before enemies and hazards scale up.

## Preconditions
- Phase 05 passed.
- Player movement and attacks are stable.

## Files affected
- `phaser/entities/PlayerController.js`
- `phaser/components/**/*`
- `phaser/systems/**/*`
- `phaser/ui/**/*`

## Implementation requirements
- Inspect current player data first.
- Add only core player state: hp, max hp, hurt, invuln, death/respawn hook.
- Keep state transitions explicit.
- Do not add full save integration yet.

## Architecture rules
- Separate persistent player stats from frame-to-frame motion data.
- Prefer component/data containers over scattered properties.

## Visual/game feel expectations
- Taking damage should read clearly.
- Hurt windows should feel fair.

## Acceptance criteria
- Player can receive damage and recover safely.
- Death/respawn hook exists or is stubbed cleanly.

## Manual test checklist
- Trigger damage.
- Confirm invulnerability window.
- Confirm recovery/respawn path.

## Regression risks
- Hurt handling can conflict with movement/combat timers.

## Definition of done
- Player core state is ready for enemy and hazard integration.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
