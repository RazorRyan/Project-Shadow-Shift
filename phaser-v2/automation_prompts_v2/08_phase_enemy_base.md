# 08 Phase Enemy Base

## Goal
- Create a reusable base enemy architecture for Phaser encounters.

## Why this matters
- Enemy reuse depends on a shared foundation for health, movement intent, hurt state, and hooks.

## Preconditions
- Phase 07 passed.
- Combat framework exists.

## Files affected
- `phaser/entities/**/*`
- `phaser/components/**/*`
- `phaser/combat/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect current dummy/target code first.
- Replace or extend the training dummy into a real enemy base.
- Include only core hooks: spawn, hp, hurt, defeat, facing, simple update.
- Keep AI minimal in this phase.

## Architecture rules
- Data-driven enemy stats.
- Shared base, specialized behaviors later.

## Visual/game feel expectations
- Enemy should read as a live target, not a prop.
- Hurt reactions must be clear.

## Acceptance criteria
- At least one reusable enemy base class/module exists.
- It can be damaged and defeated.

## Manual test checklist
- Spawn enemy.
- Attack enemy.
- Confirm defeat flow.

## Regression risks
- Enemy base can become too opinionated too early.

## Definition of done
- Enemy base is ready for AI layering.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
