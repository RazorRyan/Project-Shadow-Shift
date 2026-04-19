# 02 Phase Game Feel

## Goal
- Upgrade movement and attack feel so the sandbox stops reading as blocky and starts feeling responsive, weighty, and modern.

## Why this matters
- Feel quality drives the whole project and should stabilize before larger systems pile on top.

## Preconditions
- Phase 01 passed.
- Current player movement and melee sandbox work.

## Files affected
- `phaser/entities/PlayerController.js`
- `phaser/config/**/*`
- `phaser/fx/**/*`

## Implementation requirements
- Inspect current movement and attack timing first.
- Improve only one high-value feel slice this run.
- Prioritize acceleration, jump arc response, dash entry/exit, attack commitment, or landing feel.
- Keep tuning centralized.
- Do not add unrelated systems.

## Architecture rules
- Put tuning in config/data files.
- Keep feel helpers reusable.

## Visual/game feel expectations
- Inputs should feel snappier.
- Motion should read less rigid.
- Combat actions should feel more intentional.

## Acceptance criteria
- One meaningful feel improvement is in place.
- No physics instability.

## Manual test checklist
- Run, jump, dash, attack.
- Compare startup, stop, and landing feel.

## Regression risks
- Over-tuning can break movement timing.

## Definition of done
- One clear feel improvement works and remains stable.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
