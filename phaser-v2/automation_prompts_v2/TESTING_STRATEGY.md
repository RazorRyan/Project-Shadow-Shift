# Testing Strategy

## Run style
- Test after every phase.
- Prefer manual verification first.
- Keep each phase small enough to isolate regressions.

## Test types
- Boot test
- Input test
- Feel test
- Collision test
- Combat test
- Scene transition test
- Save/load test
- Performance sanity test

## Regression policy
- If a phase fails, stop.
- Fix before continuing.
- Do not stack unrelated fixes into later phases.

## Evidence to collect
- Boot success
- Main action success
- No new console/runtime errors
- No obvious regressions in prior systems
