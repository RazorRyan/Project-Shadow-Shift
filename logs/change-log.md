# Project Shadow Shift — Change Log

---

## 2026-04-24 — Mobile Fullscreen + Control Optimization

**PR:** Mobile Fullscreen + Control Optimization

### Summary

Fixed the mobile web layout so the game fills the entire screen edge-to-edge on modern smartphones (Samsung Galaxy S25 and similar) — especially in landscape orientation. Also reduced touch control sizes by ~15–20% to improve gameplay visibility without sacrificing thumb-friendliness.

### Changes

#### Mobile Fullscreen (Edge-to-Edge)
- Added `margin: 0; padding: 0; overflow: hidden;` to the `html` element to eliminate any residual browser-default scroll or offset.
- Added `height: 100dvh; overflow: hidden;` to `.app` in `touch-mode` to enforce true full-viewport height (uses `dvh` to account for collapsible browser chrome).
- Added `height: 100dvh;` to `.game-panel` in `touch-mode` (was `min-height` only) so the canvas layout function receives accurate panel bounds.
- In landscape touch mode: added `height: 100dvh`, `padding-bottom`, `padding-left`, and `padding-right` using `env(safe-area-inset-*)` so notch/camera cutout areas are respected.

#### Touch Control Sizing (–15–20%)
| Control | Before | After |
|---|---|---|
| Joystick (default) | 132 × 132 px | 112 × 112 px |
| Joystick (landscape) | 136 × 136 px | 116 × 116 px |
| Joystick (≤560px) | 112 × 112 px | 96 × 96 px |
| Joystick thumb (default) | 56 × 56 px | 48 × 48 px |
| Facepad buttons (default) | 54 × 54 px | 46 × 46 px |
| Facepad buttons (landscape) | 50 × 50 px | 43 × 43 px |
| Facepad buttons (≤560px) | 46 × 46 px | 40 × 40 px |
| Secondary buttons (facepad-sm) | 38 × 28 px | 32 × 24 px |
| Touch button minimum | 56 × 56 px | 48 × 48 px |

### Files Modified
- `webjs/styles.css` — fullscreen CSS fixes, safe-area insets for landscape, control size reduction across all breakpoints

### Files Created
- `logs/change-log.md` — this file (new PR-level change log)
