Status: DONE

# Task 01: Combat Feel Pass

Goal:

Make combat feel more responsive and satisfying in the browser game without changing the game's core scope.

Prompt:

Work only in the browser version under `C:\development\Project Shadow Shift\Web`.

Improve combat feel with a strong focus on responsiveness and readability:

- add hit pause on successful attacks
- add enemy knockback when struck
- add player recoil or subtle follow-through when attacking
- add clearer enemy hurt feedback
- add small impact particles or slash trails drawn in canvas
- keep controls and core mechanics intact
- keep the implementation lightweight and dependency-free

Do not rewrite the whole game. Make practical, self-contained improvements that preserve the current structure.

When complete:

- change the top line to `Status: DONE`
- add a short bullet list under `Completion Notes`

Completion Notes:
- Added brief hit-stop and screen shake on landed hits so melee impacts read immediately.
- Added enemy knockback, hurt flash/jitter, and extra impact bursts on kills.
- Added player attack follow-through, hurt recoil, and a cleaner attack arc/slash trail.
- Added lightweight canvas particles and kept the implementation dependency-free inside `Web\game.js`.
