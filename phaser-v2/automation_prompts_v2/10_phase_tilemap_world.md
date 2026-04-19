# 10 Phase Tilemap World

## Goal
- Introduce the first tilemap/world pipeline for authored rooms.

## Why this matters
- A real Metroidvania needs room-driven world structure, not only block-generated test geometry.

## Preconditions
- Phase 09 passed.
- Phaser sandbox is stable.

## Files affected
- `phaser/world/**/*`
- `phaser/scenes/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect current layout spawning first.
- Add one safe tilemap world slice.
- Prioritize tilemap loading, collision layers, spawn points, or room data.
- Replace only enough of the hardcoded test layout to prove the pipeline.

## Architecture rules
- World data must not live only inside scene code.
- Separate map loading from gameplay logic.

## Visual/game feel expectations
- Room geometry should feel more authored and less sandbox-like.

## Acceptance criteria
- At least one playable room loads through the tilemap/world pipeline.

## Manual test checklist
- Boot room.
- Move through geometry.
- Confirm collisions and spawn.

## Regression risks
- Tile collision mismatch.

## Definition of done
- First real room pipeline works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
