Status: DONE

# Phase 06: Dash Invincibility Frames

Goal:

Grant the player brief invulnerability during the active dash window so dashing through enemies and hazards is a viable skill expression.

Scope:

- In `startDash`, set `player.invuln = player.dashDuration + 0.04` (covers the full dash plus a 40ms buffer)
- This reuses the existing `player.invuln` system already used for post-hit recovery — no new state needed
- Do not grant invuln during dash cooldown, only during active dash (`dashTimer > 0`)
- Visually the player already flickers when `invuln > 0` (existing hurt flash path) — verify this reads correctly; if the flicker is too noisy during a normal dash, gate the visual on `hurtFlash > 0` only

Files:
- `webjs/game.js` (`startDash`)

Completion Notes:
