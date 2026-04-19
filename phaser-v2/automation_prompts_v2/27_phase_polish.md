# 27 Phase Polish

## Goal
- Add the first real polish pass across feel, readability, and consistency.

## Why this matters
- Final quality comes from tightening the seams between systems, not just having all systems present.

## Preconditions
- Phase 26 passed.

## Files affected
- `phaser/**/*`

## Implementation requirements
- Inspect the current build first.
- Choose one high-value polish slice only.
- Prioritize readability, telegraphs, transition smoothness, HUD cleanup, or mechanic clarity.
- Avoid giant grab-bag changes.

## Architecture rules
- Polish should reuse existing systems.
- Do not jam shortcuts into scene code.

## Visual/game feel expectations
- Game should feel more cohesive and deliberate.

## Acceptance criteria
- One meaningful polish improvement is visible.

## Manual test checklist
- Play a short traversal/combat loop.
- Confirm readability and cohesion improved.

## Regression risks
- Broad polish passes can hide unintended gameplay changes.

## Definition of done
- One focused polish slice lands cleanly.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
