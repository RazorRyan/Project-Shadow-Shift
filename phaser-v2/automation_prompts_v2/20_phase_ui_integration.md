# 20 Phase UI Integration

## Goal
- Replace placeholder HUD shell behavior with integrated gameplay UI.

## Why this matters
- Core mechanics need stable on-screen feedback for testing and real play.

## Preconditions
- Phase 19 passed.

## Files affected
- `phaser/ui/**/*`
- `phaser/scenes/**/*`
- `phaser/systems/**/*`

## Implementation requirements
- Inspect current DOM/UI bridge first.
- Move one high-value UI slice into a cleaner integrated layer.
- Prioritize health, element, world state, weapon stage, or ability indicators.
- Keep HUD lean and readable.

## Architecture rules
- UI reads from systems/state, not duplicated scene data.
- Keep UI render/update paths modular.

## Visual/game feel expectations
- HUD should feel deliberate and readable, not placeholder.

## Acceptance criteria
- Core gameplay state is visible through a stable UI layer.

## Manual test checklist
- Change health/state.
- Confirm HUD updates correctly.

## Regression risks
- UI drift from gameplay state.

## Definition of done
- Gameplay-critical UI is integrated cleanly.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
