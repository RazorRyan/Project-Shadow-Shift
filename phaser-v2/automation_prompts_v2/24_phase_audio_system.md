# 24 Phase Audio System

## Goal
- Add a reusable audio framework for SFX, ambience, and music hooks.

## Why this matters
- Audio is a major part of game feel and feedback quality.

## Preconditions
- Phase 23 passed.

## Files affected
- `phaser/systems/**/*`
- `phaser/data/**/*`
- `phaser/scenes/**/*`

## Implementation requirements
- Inspect current sound usage first.
- Add only core audio routing and a few high-value hooks.
- Prioritize attack, hit, jump, dash, swap, and room/boss hooks.
- Keep asset binding data-driven.

## Architecture rules
- Scenes request sounds through a shared layer.
- Do not scatter raw audio keys everywhere.

## Visual/game feel expectations
- Audio should support clarity and weight.

## Acceptance criteria
- Shared audio layer exists and at least a few actions route through it.

## Manual test checklist
- Trigger movement/combat actions.
- Confirm correct sounds play.

## Regression risks
- Audio spam or repeated trigger overlap.

## Definition of done
- Audio system foundation works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
