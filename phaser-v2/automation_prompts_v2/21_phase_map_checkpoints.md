# 21 Phase Map Checkpoints

## Goal
- Add checkpoint flow and the first map/progression visibility layer.

## Why this matters
- Checkpoints support iteration and the map anchors Metroidvania navigation.

## Preconditions
- Phase 20 passed.
- Save system exists.

## Files affected
- `phaser/world/**/*`
- `phaser/save/**/*`
- `phaser/ui/**/*`
- `phaser/data/**/*`

## Implementation requirements
- Inspect room/save flow first.
- Add one compact checkpoint system and one lightweight map layer.
- Keep the map minimal if needed: current room + visited tracking is enough.
- Do not build a huge menu yet.

## Architecture rules
- Checkpoint and map state must persist through save data.
- Room metadata should drive map state.

## Visual/game feel expectations
- Checkpoint activation should read clearly.

## Acceptance criteria
- Checkpoints work and visited room state can be tracked or displayed.

## Manual test checklist
- Activate checkpoint.
- Reload.
- Confirm restore.
- Confirm room tracking.

## Regression risks
- Checkpoint/save state mismatch.

## Definition of done
- Checkpoint flow and minimal mapping are functional.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
