Status: DONE

# Phase 01: Jump, Land, and Dash Sounds

Goal:

Add the three most-triggered missing sounds in the game. These are the highest ratio of feel improvement to effort.

Scope:

- Jump sound: short filtered noise burst + rising tone when player leaves the ground (`performGroundJump`, `performWallJump`)
- Land sound: force-scaled impact — soft tap for low-speed lands, heavier thud for falls above a threshold (trigger in `moveVertically` when `vy` goes to zero after positive value)
- Dash whoosh: filtered noise sweep + pitch-shifted blade tone when `startDash` fires

All sounds use the existing Web Audio API pattern (`audioContext`, `masterGain`).
No new dependencies.
No changes to movement physics or gameplay logic.

Files:
- `webjs/game.js`

Completion Notes:
