# 19 Phase Weapon Evolution

## Goal
- Add the core Weapon Evolution framework and first upgrade tier support.

## Why this matters
- Weapon growth needs to alter combat behavior, not just stats.

## Preconditions
- Phase 18 passed.

## Files affected
- `phaser/combat/**/*`
- `phaser/data/**/*`
- `phaser/systems/**/*`
- `phaser/ui/**/*`

## Implementation requirements
- Inspect current attack config first.
- Add only the core weapon stage framework and one upgrade path.
- Support queryable weapon stage and combat scaling hooks.
- Keep attack profile changes data-driven.

## Architecture rules
- Weapon evolution should not be hardcoded inside the player scene logic.
- Upgrade effects should flow through combat config.

## Visual/game feel expectations
- Weapon upgrade should feel stronger or broader immediately.

## Acceptance criteria
- Weapon stage changes update combat behavior safely.

## Manual test checklist
- Upgrade weapon.
- Attack.
- Confirm changed behavior or damage profile.

## Regression risks
- Attack balance and combo tuning can drift.

## Definition of done
- Weapon evolution foundation works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
