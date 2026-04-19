# 04 Phase Camera FX And Impact

## Goal
- Add a first-pass camera and impact FX layer for movement, hits, landings, and scene readability.

## Why this matters
- Camera response and impact FX are key to a premium action feel.

## Preconditions
- Phase 03 passed.
- Player movement and attacks work.

## Files affected
- `phaser/scenes/GameScene.js`
- `phaser/fx/**/*`
- `phaser/systems/**/*`

## Implementation requirements
- Inspect current camera and hit feedback first.
- Add one safe shared impact layer.
- Prioritize camera follow tuning, landing response, hit shake, slash flash, or dust/impact effects.
- Keep effects modular and easy to tune.
- Do not overbuild a full VFX suite.

## Architecture rules
- Scene triggers effects, systems execute them.
- Keep effect configs reusable.

## Visual/game feel expectations
- Hits should feel heavier.
- Movement should feel grounded.
- Camera should support readability, not fight it.

## Acceptance criteria
- One meaningful impact/camera improvement is active.
- No nausea, jitter, or constant shake spam.

## Manual test checklist
- Move, land, dash, attack.
- Check readability and impact.

## Regression risks
- Overactive camera motion.

## Definition of done
- Shared impact feedback exists and improves feel.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
