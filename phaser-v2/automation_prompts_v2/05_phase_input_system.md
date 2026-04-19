# 05 Phase Input System

## Goal
- Replace direct scene input coupling with a reusable input abstraction layer.

## Why this matters
- Input abstraction is needed for rebinding, multiple devices, Android support, and cleaner controllers.

## Preconditions
- Phase 04 passed.
- Player uses Phaser keyboard input directly today.

## Files affected
- `phaser/input/**/*`
- `phaser/entities/PlayerController.js`
- `phaser/scenes/GameScene.js`

## Implementation requirements
- Inspect current input flow first.
- Create a compact action-based input layer.
- Route movement, jump, dash, attack through the abstraction.
- Preserve current controls.
- Do not add remapping UI yet.

## Architecture rules
- Input actions, not raw key checks, should drive gameplay.
- Keep the layer reusable by player, UI, and future debug tools.

## Visual/game feel expectations
- No input latency regression.
- Action timing should remain tight.

## Acceptance criteria
- Player actions use the shared input system.
- Controls still behave correctly.

## Manual test checklist
- Move, jump, dash, attack.
- Confirm start flow still works.

## Regression risks
- Edge-triggered actions can break if pressed-state logic changes.

## Definition of done
- One clean input abstraction replaces direct scene key coupling.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
