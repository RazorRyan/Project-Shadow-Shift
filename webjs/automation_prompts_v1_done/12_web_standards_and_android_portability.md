Status: DONE

# Task 12: Web Standards and Android Portability

Goal:

Improve the browser game's technical structure so it follows stronger web game development practices and is easier to adapt for Android later.

Prompt:

Work only in the browser version under `C:\development\Project Shadow Shift\Web`.

Review and improve the project with a focus on standards and portability:

- improve code organization where practical
- reduce browser-specific fragility
- improve input handling for desktop and future touch support
- improve audio handling so it behaves more reliably across browsers
- improve scaling and rendering behavior on different screen sizes
- reduce obvious performance risks
- keep the game dependency-free unless there is a very strong reason not to
- keep keyboard play intact

Portability goals:

- make the game easier to wrap for Android later
- avoid patterns that would be painful on mobile browsers
- prefer cleaner separation of game state, rendering, input, audio, and UI where practical

Do not turn this into a framework rewrite. Make pragmatic improvements that help the current project move toward a more portable structure.

When complete:

- change the top line to `Status: DONE`
- add a short bullet list under `Completion Notes`

Completion Notes:

- Added safer mobile viewport metadata and touch-friendly markup, fixed the broken touch button labels, and improved CSS for dynamic viewport height and overscroll control.
- Hardened browser lifecycle handling with blur/page-hide input cleanup, visibility-based audio suspension/resume, and touch-mode detection so desktop and mobile input states are less fragile.
- Added lightweight runtime cleanup in the game code with explicit canvas setup, capped transient effects, and max-HP initialization so the prototype is more stable and easier to wrap for Android later.
