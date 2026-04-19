# 23 Phase Boss Framework

## Goal
- Create the boss encounter framework for multi-phase encounters.

## Why this matters
- Bosses need stronger structure than normal enemy AI and should be built before content-specific encounters.

## Preconditions
- Phase 22 passed.

## Files affected
- `phaser/entities/**/*`
- `phaser/systems/**/*`
- `phaser/combat/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect enemy AI and combat framework first.
- Add only the base boss controller, phase thresholds, and attack selection hooks.
- Support one simple boss prototype if needed.
- Do not build a full polished boss fight yet.

## Architecture rules
- Boss logic should be phase-driven and data-backed.
- Reuse enemy/combat systems where possible.

## Visual/game feel expectations
- Boss state changes should be readable.

## Acceptance criteria
- Boss framework exists and can run a simple multi-phase loop.

## Manual test checklist
- Spawn boss.
- Damage boss into next phase.
- Confirm phase change logic.

## Regression risks
- Boss-specific logic can bypass shared combat systems.

## Definition of done
- Boss framework foundation is in place.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
