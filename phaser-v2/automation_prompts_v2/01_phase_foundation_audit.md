# 01 Phase Foundation Audit

## Goal
- Audit the current Phaser V2 sandbox and restructure the codebase toward the target modular folder layout without changing gameplay behavior.

## Why this matters
- Clean structure reduces future rewrite risk and keeps all later phases incremental.

## Preconditions
- Phaser boots.
- Movement sandbox exists.
- Player movement and attack currently work.

## Files affected
- `phaser/main.js`
- `phaser/scenes/GameScene.js`
- `phaser/**/*`

## Implementation requirements
- Inspect current folders and file responsibilities first.
- Move only the highest-value foundations into `core`, `systems`, `helpers`, `fx`, `ui`, `world`, `data`, or `components` as needed.
- Keep the game booting after the refactor.
- Do not change feel, combat balance, or world behavior yet.
- Add only the minimum folder scaffolding needed for the next phases.

## Architecture rules
- Keep scenes thin.
- No monolithic utility file.
- Prefer helper/system extraction over deep inheritance.

## Visual/game feel expectations
- No visible regression.
- Sandbox should look and behave the same after this pass.

## Acceptance criteria
- Folder structure starts matching the target architecture.
- Boot path is still clear.
- Scene still runs.

## Manual test checklist
- Launch Phaser V2.
- Start the scene.
- Confirm movement and attack still load.

## Regression risks
- Broken imports during file moves.

## Definition of done
- One safe structural pass completed and the sandbox still boots.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
