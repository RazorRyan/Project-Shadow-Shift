Status: DONE

# Phase 07: World Swap Flash and Sweep Sound

Goal:

The Shadow Swap is the signature mechanic of the game. It currently has no visual punctuation and no sound. Fix both.

Scope:

Visual:
- On `performWorldSwap`, set a new state flag `state.swapFlashTimer = 0.14`
- In `draw()`, after `ctx.restore()`, if `swapFlashTimer > 0`: draw a full-canvas rect with alpha = `swapFlashTimer / 0.14 * 0.22`, color based on target world (`#a0a8ff` for Shadow, `#f0e8c8` for Light)
- Decay `swapFlashTimer` in `updateSimulation`

Sound:
- New function `playSwapSound()` — a deep resonant filter sweep:
  - Low sine oscillator at 90Hz → ramps to 55Hz over 0.5s, gain 0.03
  - Bandpass-filtered noise burst (center 320Hz, Q 1.2), duration 0.4s, gain 0.018
  - A soft ghost bell at 277Hz (existing `playGhostBell`) at gain 0.003
- Call `playSwapSound()` inside `performWorldSwap` when the swap succeeds

Files:
- `webjs/game.js`

Completion Notes:
