# 09 Phase Enemy AI

## Goal
- Add first-pass enemy AI behavior on top of the base enemy framework.

## Why this matters
- The game needs living encounters, not static targets.

## Preconditions
- Phase 08 passed.
- At least one enemy base exists.

## Files affected
- `phaser/entities/**/*`
- `phaser/systems/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect enemy base and combat hooks first.
- Implement one simple but solid AI loop: idle, patrol, chase, attack window, recover.
- Keep it deterministic and easy to debug.
- Do not add multiple enemy types unless trivial.

## Architecture rules
- AI state should be explicit.
- Behavior tuning should live in data/config where practical.

## Visual/game feel expectations
- Enemy intent should be readable.
- Attack windows should feel fair.

## Acceptance criteria
- One real AI enemy can pressure the player.

## Manual test checklist
- Approach enemy.
- Trigger chase/attack.
- Confirm enemy can be defeated.

## Regression risks
- AI can overwhelm the sandbox if aggression is poorly tuned.

## Definition of done
- Basic enemy encounter loop works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
