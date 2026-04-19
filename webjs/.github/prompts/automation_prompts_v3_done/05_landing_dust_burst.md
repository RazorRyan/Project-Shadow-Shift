Status: DONE

# Phase 05: Landing Dust Burst

Goal:

When the player lands after a fall, emit a small burst of dust particles scaled to impact velocity.

Scope:

- Detect landing: in `moveVertically`, record `lastFallVy` just before `vy` is zeroed by ground collision
- If `lastFallVy > 160`, spawn a landing dust burst using `spawnImpactParticles` (or a new helper)
- Dust count = 4 + floor(lastFallVy / 120), capped at 12
- Color: muted grey/stone tone matching room theme (`getRoomVisualTheme`)
- Particles spread horizontally (low angle, ±30° from horizontal), short lifetime (0.18–0.28s)
- Below 160 vy: no dust (walking onto platform feels different to hard landing)
- Do not affect combat particle budget

Files:
- `webjs/game.js`

Completion Notes:
