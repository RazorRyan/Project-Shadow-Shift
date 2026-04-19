# 07 Phase Combat Framework

## Goal
- Build the reusable Phaser combat framework beyond the current sandbox attack pass.

## Why this matters
- Combat needs shared hit, hurt, damage, timing, and event plumbing before enemies grow in complexity.

## Preconditions
- Phase 06 passed.
- Player melee sandbox already exists.

## Files affected
- `phaser/combat/**/*`
- `phaser/systems/**/*`
- `phaser/entities/**/*`

## Implementation requirements
- Inspect current combat sandbox first.
- Build only the highest-value framework slice.
- Prioritize shared hitbox/hurtbox handling, damage events, reactions, or combat state cleanup.
- Preserve current melee behavior while reducing one-off logic.
- Do not build full enemy content here.

## Architecture rules
- Shared combat helpers must be entity-agnostic.
- Prefer small data structures over scene-owned combat state.

## Visual/game feel expectations
- Combat timing should stay sharp.
- Reactions should be readable.

## Acceptance criteria
- Combat logic is more reusable and less sandbox-specific.
- Player attacks still work.

## Manual test checklist
- Attack target dummy.
- Confirm hit registration and reaction.

## Regression risks
- Refactoring can break hit timing.

## Definition of done
- Shared combat framework foundation is in place.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
