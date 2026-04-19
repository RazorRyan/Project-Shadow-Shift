# 13 Phase Ability System

## Goal
- Create a shared ability unlock and query framework.

## Why this matters
- Later mechanics and progression gates need one source of truth for what the player can do.

## Preconditions
- Phase 12 passed.

## Files affected
- `phaser/systems/**/*`
- `phaser/data/**/*`
- `phaser/save/**/*`

## Implementation requirements
- Inspect progression state first.
- Add a shared ability registry/query layer.
- Cover only unlock state, ownership, and checks.
- Do not implement new abilities here.

## Architecture rules
- Ability checks should not be scattered across scenes.
- Keep ability ids data-driven and save-safe.

## Visual/game feel expectations
- No direct visual requirement in this phase.

## Acceptance criteria
- Abilities can be queried and persisted cleanly.

## Manual test checklist
- Unlock an ability in test data.
- Confirm checks respond correctly.

## Regression risks
- Bad ids can fragment progression logic.

## Definition of done
- Shared ability framework exists.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
