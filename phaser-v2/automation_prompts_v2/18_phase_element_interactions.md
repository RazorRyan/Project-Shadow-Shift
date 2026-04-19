# 18 Phase Element Interactions

## Goal
- Integrate element reactions into combat and the environment.

## Why this matters
- Element Shift only gains depth once enemies, hazards, and world objects respond to it.

## Preconditions
- Phase 17 passed.

## Files affected
- `phaser/combat/**/*`
- `phaser/world/**/*`
- `phaser/entities/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect the element system first.
- Add one meaningful interaction slice this run.
- Prioritize enemy weakness/resistance, hazard reaction, or traversal object reaction.
- Keep reaction logic centralized.

## Architecture rules
- Use shared reaction tables/helpers.
- Avoid hardcoding reactions in many entity files.

## Visual/game feel expectations
- Element outcomes must be visually obvious.

## Acceptance criteria
- At least one combat or world interaction responds to element state.

## Manual test checklist
- Switch element.
- Trigger reaction.
- Confirm outcome changes.

## Regression risks
- Interaction rules can become inconsistent quickly.

## Definition of done
- First meaningful element integration works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
