# Project Shadow Shift

Shadow Shift is a 2D platformer prototype repository with multiple historical implementations.

## Production deployment target (official)

The **TypeScript engine in `webjs/src`** is the only official production build and deployment target.

- Production entrypoint: `webjs/src/main.ts` (loaded by `webjs/index.html`)
- Production toolchain: Vite (`webjs/vite.config.ts`)
- Production build output: `webjs/dist`
- Production deploy target: **Cloudflare Pages from `webjs/dist`**

## Legacy vs production versions

- **Production (official):** `webjs/src/**` (TypeScript modules, bundled by Vite)
- **Legacy/reference only:** `webjs/game.js` and `webjs/engine/*.js`
  - These files are kept for history/reference and are **not** the deployment source of truth.
  - Do not use them for Pages build/deploy configuration.

## Project structure overview

- `webjs/` — web build target
  - `src/` — TypeScript game engine and gameplay code (**production source**)
  - `index.html` — app shell that loads `src/main.ts`
  - `vite.config.ts` — Vite build/dev config
  - `dist/` — generated production output (after build)
  - `game.js`, `engine/*.js` — legacy JS reference implementation
- `phaser-v2/` — experimental/non-deployment archive materials
- `unity/`, `android/` — other platform explorations/assets

## Run the TypeScript game locally

```bash
cd /home/runner/work/Project-Shadow-Shift/Project-Shadow-Shift/webjs
npm ci
npm run dev
```

Vite will start a local dev server for the TypeScript version.

## Build the TypeScript version

```bash
cd /home/runner/work/Project-Shadow-Shift/Project-Shadow-Shift/webjs
npm ci
npm run build
```

Build output is generated in:

`/home/runner/work/Project-Shadow-Shift/Project-Shadow-Shift/webjs/dist`

## Preview the production build

```bash
cd /home/runner/work/Project-Shadow-Shift/Project-Shadow-Shift/webjs
npm run preview
```

## Cloudflare Pages deployment (TypeScript version only)

Create a Cloudflare Pages project and configure it with these exact settings:

1. **Connect repository:** `RazorRyan/Project-Shadow-Shift`
2. **Framework preset:** `Vite`
3. **Root directory:** `webjs`
4. **Build command:** `npm ci && npm run build`
5. **Build output directory:** `dist`
6. **Node.js compatibility:** use current LTS
7. Deploy.

This configuration ensures Pages always builds from the TypeScript engine (`webjs/src`) and publishes only `webjs/dist`.
