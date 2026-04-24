# Project Shadow Shift — Change Log

---

## 2026-04-24 — Fix: Absolute-Inset Canvas + Resize Handler (Samsung S25 Edge-to-Edge)

**PR:** Fix Phaser canvas not filling mobile landscape viewport (follow-up fix #3)

### Root Cause

Two independent failure modes prevented the canvas from filling the screen:
1. **`dvh` timing** — `#phaser-root { height: 100% }` depended on `.game-panel { height: 100dvh }` being resolved, but Phaser's Scale Manager calls `getBoundingClientRect()` during module-script execution, before Samsung Internet finishes computing `dvh`. Phaser saw `height = 0` and fell back to the 1280×720 config baseline.
2. **Inline style override** — `Phaser.Scale.EXPAND` writes `canvas.style.width/height` as inline px values after init. CSS media-query rules have lower specificity than inline styles, so `width: 100%; height: 100%` was silently ignored.

### Changes

#### `#phaser-root` geometry (`phaser-v2/styles.css`)
- Changed from `width: 100%; height: 100%` to `position: absolute; inset: 0` — fills `.game-panel` purely by geometry with no height-inheritance chain or `dvh` timing dependency.
- Added `!important` to `#phaser-root canvas` width/height/margin overrides to beat Phaser's inline style writes.

#### Resize & orientation listeners (`phaser-v2/phaser/main.js`)
- Captures the `Phaser.Game` instance returned by `createGame()`.
- Calls `game.scale.refresh()` via `requestAnimationFrame` on first paint.
- Adds `resize` and `orientationchange` (150 ms debounced) listeners so Phaser re-measures on every viewport change.

#### Explicit scale config (`phaser-v2/phaser/config/gameConfig.js`)
- Added `autoCenter: Phaser.Scale.NO_CENTER` and `expandParent: false` for unambiguous scale behavior.

### Files Modified
- `phaser-v2/styles.css`
- `phaser-v2/phaser/main.js`
- `phaser-v2/phaser/config/gameConfig.js`


---

## 2026-04-24 — Fix: Expand Canvas to Fill Ultra-Wide Screens (Samsung S25)

**PR:** Mobile Fullscreen + Control Optimization (follow-up fix #2)

### Root Cause

`Phaser.Scale.FIT` preserves the 16:9 aspect ratio and centres the canvas with black pillarboxes. On a Samsung S25 (19.5:9 landscape) this leaves ~141 game-units of dead space on each side. The phone's own Game Assistant overlay renders its virtual controller buttons in those black bars instead of overlapping the game.

### Changes

#### `Phaser.Scale.EXPAND` (`phaser-v2/phaser/config/gameConfig.js`)
- Changed scale mode from `FIT` to `EXPAND`. With EXPAND the canvas fills the parent div fully; extra game-world is revealed on wider screens rather than being letterboxed/pillarboxed. The 1280×720 base resolution becomes the minimum visible area.
- Removed `autoCenter` (not applicable in EXPAND — the canvas is always flush with the container).

#### Wide backdrop geometry (`phaser-v2/phaser/scenes/GameScene.js`)
- Sky and floor rectangles widened from 1280 to 3840 px so that ultra-wide viewports see backdrop colour rather than the engine default `#0a0d16`.
- Terrain-silhouette polygons extended left to −1920 and right to 3840 at the height of their original edge points, so the jagged mountain silhouette blends seamlessly into the sky on any aspect ratio.

### Files Modified
- `phaser-v2/phaser/config/gameConfig.js`
- `phaser-v2/phaser/scenes/GameScene.js`


---

## 2026-04-24 — Fix: Phaser-v2 Mobile Fullscreen (Cloudflare Target)

**PR:** Mobile Fullscreen + Control Optimization (follow-up fix)

### Root Cause

The previous PR (#1) applied all CSS changes to `webjs/styles.css`. However, Cloudflare (`wrangler.jsonc`) is configured to serve from the `phaser-v2/` directory. The `phaser-v2` version had:
- No Phaser Scale Manager — canvas was always rendered at 1280×720 px (larger than any phone screen), causing overflow and cropping on mobile
- CSS with hard-coded `min-height: 768px`, `padding: 24px`, no `dvh` units, and no mobile layout
- Viewport meta tag missing `viewport-fit=cover`

### Changes

#### Phaser Scale Manager (`phaser-v2/phaser/config/gameConfig.js`)
- Added `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 }` to the game config
- `FIT` mode scales the canvas to fill its parent div while maintaining 16:9 aspect ratio; `CENTER_BOTH` centers it
- Removed top-level `width`/`height` (now owned by the `scale` config)

#### Mobile Fullscreen CSS (`phaser-v2/styles.css`)
- Added `html` reset: `margin: 0; padding: 0; height: 100%; overflow: hidden`
- Changed `body` to use `min-height: 100dvh` (dynamic viewport height) instead of `100vh`
- Added `overflow: hidden; overscroll-behavior: none; touch-action: none` to body
- Added `min-height: 100dvh` to `.app-shell`
- Updated `@media (max-width: 1100px)` to also match `(hover: none) and (pointer: coarse)`:
  - `.app-shell`: `padding: 0; gap: 0; height: 100dvh` — removes all desktop margins
  - `.hud-panel`: `display: none` — hides sidebar on mobile
  - `.game-panel`: `height: 100dvh; border-radius: 0; border: none; box-shadow: none` + safe-area insets for notched devices
  - `#phaser-root`: `height: 100%; min-height: 0` — allows Phaser Scale Manager to measure full panel

#### Viewport Meta Tag (`phaser-v2/index.html`)
- Added `viewport-fit=cover` (enables safe-area inset support for notched/curved screens)
- Added `maximum-scale=1.0, user-scalable=no` (prevents pinch-zoom interference)

### Files Modified
- `phaser-v2/phaser/config/gameConfig.js`
- `phaser-v2/styles.css`
- `phaser-v2/index.html`


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


---

## 2026-04-24 — Cloudflare Deployment Email Notifications

**Summary:**
Added a Cloudflare Worker that listens for Cloudflare Pages deployment webhook events
(success and failure) and sends an email notification to Ryan.chetty16@gmail.com with
full deployment details (status, environment, project, branch, commit message, deployment
URL, and timestamp).

**Files Changed:**
- `workers/deployment-email-worker.js` — New Worker that validates the webhook secret,
  parses the Pages deployment payload, and sends a formatted HTML + plain-text email via
  the Cloudflare Email Send binding (`SEND_EMAIL`).
- `wrangler.toml` — New Wrangler configuration for the `deployment-email-worker` Worker;
  includes the `SEND_EMAIL` binding declaration. No secrets are stored in this file.
- `docs/cloudflare-deployment-email.md` — New documentation covering setup steps,
  architecture, and testing instructions.
- `logs/change-log.md` — This file; created as the project change log.

**Notes:**
- **Cloudflare manual setup is still required.** The repo contains only the Worker
  source code and config. The following steps must be performed in the Cloudflare
  dashboard or via the Wrangler CLI:
  1. Enable Email Routing for your domain and verify Ryan.chetty16@gmail.com.
  2. Deploy the Worker: `wrangler deploy --config wrangler.toml`.
  3. Add `WEBHOOK_SECRET` as an encrypted secret: `wrangler secret put WEBHOOK_SECRET`.
  4. Configure the Pages project webhook to POST to the Worker URL with the
     `x-webhook-secret` header on deployment success and failure events.
  5. Confirm the `SEND_EMAIL` binding is active in the Worker settings.
- Game engine code, gameplay logic, player/enemy/map/physics/combat/controls files
  were not modified.
