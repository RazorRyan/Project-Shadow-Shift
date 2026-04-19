# 16 Phase Shadow Swap Integration

## Goal
- Integrate Shadow Swap into rooms, hazards, enemies, and traversal.

## Why this matters
- The mechanic only becomes meaningful when the world responds to it.

## Preconditions
- Phase 15 passed.

## Files affected
- `phaser/world/**/*`
- `phaser/entities/**/*`
- `phaser/systems/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect Shadow Swap framework first.
- Integrate only one high-value content slice this run.
- Prioritize world-active platforms, hazard activation, or enemy phase response.
- Keep integration modular and reversible.

## Architecture rules
- World-reactive objects should use shared interfaces.
- Do not scatter swap checks everywhere.

## Visual/game feel expectations
- Active/inactive world content must read clearly.

## Acceptance criteria
- At least one gameplay system meaningfully reacts to Shadow Swap.

## Manual test checklist
- Swap worlds.
- Confirm object/enemy/hazard reaction.

## Regression risks
- Hidden inactive-state collisions.

## Definition of done
- First meaningful Shadow integration works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
