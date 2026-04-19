# 12 Phase Save System

## Goal
- Add the first reliable save/load framework for player progression and room state.

## Why this matters
- A Metroidvania needs persistent progression before ability gating and world backtracking are meaningful.

## Preconditions
- Phase 11 passed.
- Room flow exists.

## Files affected
- `phaser/save/**/*`
- `phaser/systems/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect current runtime state first.
- Implement only core save data: room, spawn/checkpoint, player core state, unlocked progression flags.
- Use a versioned save shape.
- Do not add full UI yet.

## Architecture rules
- Save schema must be explicit and easy to migrate.
- Separate persistent data from transient runtime state.

## Visual/game feel expectations
- Save/load should feel reliable and invisible.

## Acceptance criteria
- Save and load restore the intended core state.

## Manual test checklist
- Save.
- Reload.
- Confirm room/spawn/progression restore.

## Regression risks
- Missing state fields can corrupt progression flow.

## Definition of done
- Versioned save foundation works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
