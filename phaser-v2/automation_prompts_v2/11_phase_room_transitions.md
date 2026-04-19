# 11 Phase Room Transitions

## Goal
- Add room transition flow between authored spaces.

## Why this matters
- Room linking is required before progression, save, and map systems become useful.

## Preconditions
- Phase 10 passed.
- At least one tilemap room exists.

## Files affected
- `phaser/world/**/*`
- `phaser/scenes/**/*`
- `phaser/systems/**/*`

## Implementation requirements
- Inspect room loading first.
- Implement one clean transition path between rooms.
- Include spawn transfer and basic transition gating.
- Keep presentation simple in the first pass.

## Architecture rules
- Room metadata should drive transitions.
- Avoid hardcoding transition logic inside every room file.

## Visual/game feel expectations
- Transition should be readable and not disorienting.

## Acceptance criteria
- Player can move from one room to another safely.

## Manual test checklist
- Cross a room boundary.
- Confirm next room loads and player lands at correct spawn.

## Regression risks
- State reset bugs during room changes.

## Definition of done
- Basic room-to-room travel works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
