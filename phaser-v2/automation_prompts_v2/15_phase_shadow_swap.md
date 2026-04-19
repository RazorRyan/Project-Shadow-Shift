# 15 Phase Shadow Swap

## Goal
- Implement the core Shadow Swap system in Phaser.

## Why this matters
- Shadow Swap is a defining mechanic and must exist as a first-class system, not a scene hack.

## Preconditions
- Phase 14 passed.
- Ability framework exists.

## Files affected
- `phaser/systems/**/*`
- `phaser/world/**/*`
- `phaser/data/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect current world/state setup first.
- Add only the core world swap state and trigger flow.
- Support current world mode, swap request, and immediate reactive update hooks.
- Do not fully integrate all content in this phase.

## Architecture rules
- World phase must be a shared system.
- Swap should broadcast through clean interfaces.

## Visual/game feel expectations
- Swap should feel immediate and readable.

## Acceptance criteria
- Player can trigger Shadow Swap and world state updates safely.

## Manual test checklist
- Trigger swap.
- Confirm world mode changes.
- Confirm no scene break.

## Regression risks
- World desync across systems.

## Definition of done
- Core Shadow Swap framework exists.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
