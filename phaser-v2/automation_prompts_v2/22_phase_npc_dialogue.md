# 22 Phase NPC Dialogue

## Goal
- Add a lightweight NPC and dialogue framework.

## Why this matters
- NPC interactions support world building, guidance, and progression delivery.

## Preconditions
- Phase 21 passed.

## Files affected
- `phaser/entities/**/*`
- `phaser/ui/**/*`
- `phaser/data/**/*`
- `phaser/systems/**/*`

## Implementation requirements
- Inspect interaction flow first.
- Add one compact NPC interaction path and dialogue renderer.
- Keep it data-driven.
- Do not build a full narrative tool yet.

## Architecture rules
- Dialogue content should live in data files.
- Interaction logic should be reusable for signs, shrines, and NPCs.

## Visual/game feel expectations
- Interaction prompts should be readable and unobtrusive.

## Acceptance criteria
- One NPC can be approached and talked to.

## Manual test checklist
- Approach NPC.
- Trigger dialogue.
- Advance dialogue.

## Regression risks
- Dialogue input can conflict with gameplay input.

## Definition of done
- Basic NPC dialogue loop works.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
