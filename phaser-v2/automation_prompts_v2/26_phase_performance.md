# 26 Phase Performance

## Goal
- Improve performance and mobile readiness without destabilizing core gameplay.

## Why this matters
- A scalable engine must stay responsive on web and future Android targets.

## Preconditions
- Phase 25 passed.

## Files affected
- `phaser/**/*`

## Implementation requirements
- Inspect hotspots first.
- Make one high-value performance pass only.
- Prioritize update-loop cleanup, object reuse, FX throttling, culling, or mobile-safe input/render tuning.
- Do not micro-optimize everything at once.

## Architecture rules
- Prefer systemic wins over scattered tweaks.
- Keep readability intact.

## Visual/game feel expectations
- Performance gains should not make the game feel cheaper.

## Acceptance criteria
- One measurable or obvious performance improvement is in place.

## Manual test checklist
- Run combat and traversal.
- Check stutter, overdraw, or input responsiveness.

## Regression risks
- Performance edits can remove feedback quality.

## Definition of done
- One safe performance slice lands cleanly.

## Output summary format
- Use the mandatory low-token format.

## Execution
- Inspect first.
- Plan briefly.
- Implement incrementally.
- Validate.
- STOP.
