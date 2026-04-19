# 14 Phase Movement Abilities

## Goal
- Integrate movement abilities into the Phaser player framework.

## Why this matters
- Traversal growth is central to the Metroidvania loop.

## Preconditions
- Phase 13 passed.
- Player movement base is stable.

## Files affected
- `phaser/entities/PlayerController.js`
- `phaser/systems/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect current movement and ability checks first.
- Add only one or two core movement abilities this pass if needed.
- Keep unlock checks routed through the shared ability system.
- Preserve current base feel.

## Architecture rules
- Movement abilities should layer onto existing controller flow cleanly.
- Avoid special-case clutter in the scene.

## Visual/game feel expectations
- Added movement options should feel intentional and readable.

## Acceptance criteria
- New movement ability logic works and can be gated.

## Manual test checklist
- Unlock ability.
- Use it in traversal.
- Confirm locked vs unlocked behavior.

## Regression risks
- Ability hooks can destabilize base movement.

## Definition of done
- Movement abilities are integrated safely.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
