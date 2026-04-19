Status: DONE

# Phase 04: Ambient Embers

Goal:

Add slowly drifting ember particles to make the world feel continuously alive between actions.

Scope:

- Maintain a pool of ambient ember particles in `state` (separate from combat particles, max ~30)
- Each frame in `updateSimulation`, spawn 0–1 new embers near active brazier positions if pool is under cap
- Embers drift upward slowly (vy -18 to -40), slight horizontal drift, long lifetime (3–6s), tiny size (1–2px), orange/amber color with low alpha (0.25–0.55)
- Draw in `drawParticles` or a dedicated `drawEmbers` call before the player layer
- Do not affect combat particles or the existing particle pool
- Do not emit embers when the game is paused or won

Files:
- `webjs/game.js`

Completion Notes:
