Status: DONE

# Phase 03: Animated Braziers and Lantern Flicker

Goal:

Make the scene feel alive. Brazier flames are currently static bezier paths. Lantern glow radii are static.

Scope:

- Brazier flames: animate using `performance.now()` — vary flame tip height and width each frame using `sin(time * speed + x * offset)`. Two or three overlapping flame layers at slightly different phases gives convincing flicker.
- Lanterns: vary the radial gradient outer radius and the inner alpha stop using a slow sin wave per lantern position. Amplitude should be subtle (±4px radius, ±0.03 alpha).
- Do not change brazier or lantern positions
- Do not change platform geometry or collision

Files:
- `webjs/game.js` (`drawEclipseBraziers`, `drawLantern`)

Completion Notes:
