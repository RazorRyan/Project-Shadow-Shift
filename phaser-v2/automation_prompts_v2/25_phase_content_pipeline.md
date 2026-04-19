# 25 Phase Content Pipeline

## Goal
- Build the first scalable content pipeline for rooms, enemies, pickups, and tuning data.

## Why this matters
- Manual scene code cannot scale into a full game.

## Preconditions
- Phase 24 passed.

## Files affected
- `phaser/data/**/*`
- `phaser/world/**/*`
- `phaser/entities/**/*`
- `phaser/helpers/**/*`

## Implementation requirements
- Inspect current hardcoded content first.
- Extract one high-value content path into data-driven definitions.
- Prioritize enemy spawn data, room metadata, pickup data, or mechanic tuning data.
- Keep loader/validation logic simple.

## Architecture rules
- Content should live in data files wherever practical.
- Keep runtime loaders separate from content definitions.

## Visual/game feel expectations
- No visible regression.

## Acceptance criteria
- One major content path becomes data-driven.

## Manual test checklist
- Load content through new data path.
- Confirm behavior matches prior setup.

## Regression risks
- Bad data schemas can silently break content.

## Definition of done
- First scalable content pipeline slice works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
