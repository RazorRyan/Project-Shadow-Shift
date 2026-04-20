# Shadow Shift Web (TypeScript Production Target)

This directory is the official web production target for Shadow Shift.

## Source of truth

- **Production source:** `src/` (TypeScript)
- **Production entrypoint:** `src/main.ts` via `index.html`
- **Production build system:** Vite
- **Production output:** `dist/`

## Legacy/reference code

Legacy JavaScript files have been archived to:

- `../archive/legacy-js/webjs/game.js`
- `../archive/legacy-js/webjs/engine/*.js`

They are preserved for historical reference only and are **not** part of the active build/run path.

## Local development (TypeScript)

```bash
npm ci
npm run dev
```

## Production build (TypeScript)

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Cloudflare Pages target

Use Cloudflare Pages with:

- Root directory: `webjs`
- Build command: `npm ci && npm run build`
- Output directory: `dist`

## Prototype slice goals included

- movement and jump
- dash
- melee attack
- Shadow Swap
- Element Shift
- one enemy
- one Fire barrier
- one Shadow-only platform
- one seal pickup that opens the exit
- one weapon upgrade pickup
