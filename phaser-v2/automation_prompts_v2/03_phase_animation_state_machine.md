# 03 Phase Animation State Machine

## Goal
- Introduce a modular animation/state machine layer for player presentation and future enemy reuse.

## Why this matters
- Reliable state-driven animation is required for polish, telegraphs, combat timing, and scalability.

## Preconditions
- Phase 02 passed.
- Player actions already exist in Phaser.

## Files affected
- `phaser/entities/PlayerController.js`
- `phaser/components/**/*`
- `phaser/systems/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect current action/state handling first.
- Add a minimal reusable state machine or animation driver.
- Cover only the highest-value player states first: idle, run, jump, fall, dash, attack.
- Keep it data-driven where practical.
- Do not build enemy animation yet.

## Architecture rules
- Separate logical state from visual state where useful.
- Avoid hardcoding presentation logic across the scene.

## Visual/game feel expectations
- State transitions should read clearly.
- Action changes should feel intentional, not abrupt.

## Acceptance criteria
- Player has a clear state-driven animation/presentation layer.
- State transitions are readable.

## Manual test checklist
- Stand still, move, jump, fall, dash, attack.
- Confirm state changes are correct.

## Regression risks
- State conflicts can lock the player into wrong visuals.

## Definition of done
- First reusable animation/state layer works for the player.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
