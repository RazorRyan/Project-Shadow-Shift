# Shadow Shift

*A dark-fantasy action platformer prototype about crossing between Light and Shadow to survive a ruined keep.*

## Project Overview

Shadow Shift is a browser-playable indie prototype focused on fast movement, deliberate melee combat, and world-state manipulation through **Shadow Swap**.

This repository includes historical experiments, but the project is now standardized around a single active version.

## Active Version vs Archived Legacy

- ✅ **Active, maintained, production version:** `webjs/src/**` (TypeScript + Vite)
- ✅ **Web entrypoint:** `webjs/index.html` loading `webjs/src/main.ts`
- ❌ **Deprecated legacy JavaScript version:** `archive/legacy-js/**`

The `/archive/legacy-js` folder is preserved for reference only and is not part of the active run/build/deploy flow.

## Repository Structure

- `webjs/` — active game client
  - `src/` — TypeScript source of truth
  - `index.html` — app shell
  - `styles.css` — responsive UI + touch HUD styling
  - `vite.config.ts` — build tool configuration
  - `dist/` — production build output
- `archive/legacy-js/` — archived JavaScript implementation (deprecated)
- `phaser-v2/`, `unity/`, `android/` — exploration/prototype materials

## Local Setup

```bash
cd webjs
npm ci
```

## Run Locally (Development)

```bash
cd webjs
npm run dev
```

Vite will start a local development server for the TypeScript game.

## Build for Production

```bash
cd webjs
npm run build
```

Build output is generated in `webjs/dist`.

## Preview Production Build

```bash
cd webjs
npm run preview
```

## Deploy to Cloudflare Pages

Create a Cloudflare Pages project with the following settings:

1. **Repository:** `RazorRyan/Project-Shadow-Shift`
2. **Framework preset:** `Vite`
3. **Root directory:** `webjs`
4. **Build command:** `npm ci && npm run build`
5. **Build output directory:** `dist`
6. **Node.js version:** current LTS

This ensures deployment always uses the active TypeScript version.

## 🎮 Game Controls

### Keyboard (Desktop)

- **A / D** or **← / →** — Move
- **Space** — Jump
- **Shift** — Dash
- **F** — Attack
- **E** — Shadow Swap
- **R** — Interact / Rest at shrine
- **1 / 2 / 3 / 0** — Element Shift (Fire / Ice / Wind / None)
- **I** — Toggle invulnerable debug mode
- **L** — Debug challenge route

### Touch (Mobile)

- **Virtual joystick (left thumb)** — Move (with dead zone + smoothing)
- **Jump** — Jump
- **Attack** — Melee strike
- **Dash** — Dash
- **Swap** — Shadow Swap
- **Interact** — Rest/use shrine interaction
- **Element** — Cycle unlocked element stance

The mobile HUD is tuned for landscape phone gameplay with subtle, semi-transparent controls and keeps keyboard controls intact for desktop play.

## 📱 Mobile Landscape UX Notes

- Landscape mobile play is treated as first-class in the active TypeScript build.
- Touch mode prioritizes immersive gameplay area sizing with safe-area-aware spacing (including notches and browser insets).
- On modern phones (including Samsung Galaxy S25-class displays), the canvas scales to near full-screen in landscape while preserving aspect ratio.
- Movement now uses a left-side virtual joystick (base + thumb), while action buttons stay on the right for multitouch play.
- Gesture guards reduce browser interference (scrolling, pinch/zoom, and selection) during gameplay.

### Known mobile browser limitations

- Some mobile browsers delay true fullscreen behavior until user interaction and may keep minimal system UI visible.
- Dynamic browser bars can still cause slight viewport size shifts during long sessions; layout handlers react to reduce impact.

## 🕹 Gameplay Overview

You guide a lone warrior through a fractured fortress where two world phases overlap:

- Traverse platforming rooms with momentum-based movement
- Fight hostile entities and survive contact/hazard damage
- Swap between **Light** and **Shadow** to reveal paths and alter encounters
- Unlock mobility/combat upgrades (dash, weapon evolution, elemental stances)
- Reach shrines to rest, recover, and secure checkpoints
- Push toward the exit sanctum and defeat the Eclipse Lord encounter

## 📖 Lore / Story

The Eclipse Keep was once a fortress-temple guarding a celestial shard. During a failed rite, the keep split into twin realities: **Light**, the fading memory of what was, and **Shadow**, the living wound beneath it.

You are a shard-bound wanderer known only as the **Shiftbearer**. Each shrine remembers your passing, each world swap tears open hidden truths, and each boss you fell weakens the hold of the eclipse.

Your immediate pilgrimage is simple: survive the keep, master the shift, and carry the shard to the answering shrine before Shadow consumes both worlds.
