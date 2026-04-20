# Shadow Shift Web (TypeScript Production Target)

This directory is the official web production target for Shadow Shift.

## Source of truth

- **Production source:** `src/` (TypeScript)
- **Production entrypoint:** `src/main.ts` via `index.html`
- **Production build system:** Vite
- **Production output:** `dist/`

## Legacy/reference code

- `game.js`
- `engine/*.js`

These JavaScript files are legacy/reference artifacts and are **not** the official deployment target.

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
