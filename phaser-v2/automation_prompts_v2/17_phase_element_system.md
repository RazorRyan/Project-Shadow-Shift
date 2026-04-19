# 17 Phase Element System

## Goal
- Build the core Element Shift system in Phaser.

## Why this matters
- Element Shift is one of the project’s signature mechanics and needs a reusable base before content integration.

## Preconditions
- Phase 16 passed.

## Files affected
- `phaser/systems/**/*`
- `phaser/data/**/*`
- `phaser/ui/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect current player/combat state first.
- Add only the core element state, switching, and query flow.
- Support at least `None`, `Fire`, `Ice`, `Wind`.
- Do not add full world interactions yet.

## Architecture rules
- Elements should be data-driven.
- Combat and world systems should query the same source of truth.

## Visual/game feel expectations
- Element switching should be immediate and readable.

## Acceptance criteria
- Element mode can be switched and tracked.

## Manual test checklist
- Change elements.
- Confirm state/UI feedback.

## Regression risks
- Element state can drift across combat/world systems.

## Definition of done
- Core element system exists.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
