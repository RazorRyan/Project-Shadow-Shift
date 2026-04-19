# Sequential Run Protocol

## Rules
- Run ONE phase at a time.
- Use a 5-minute execution cadence:
  - run
  - summary
  - test
  - commit
  - next
- Stop if fail.
- Fix before continuing.
- Prefer many small runs over large runs.
- Do not auto-chain phases.
- Do not skip testing.

## Output mode
- Minimal narration.
- Report only high-value execution status.

## Required closing format
```text
Status: PASS | PARTIAL | BLOCKED

Files changed:
- path/file

Files created:
- path/file

Test now:
- short step

Risk:
- short line or None

Next:
- next phase or mini-pass
```
