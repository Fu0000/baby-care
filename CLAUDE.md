# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Vite)
pnpm build        # Type-check (tsc -b) then build for production
pnpm lint         # ESLint
pnpm preview      # Preview production build locally
```

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode) with **Vite 7**
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (no postcss config needed)
- **React Router DOM 7** with hash-based routing (`HashRouter` in `main.tsx`)
- **Dexie.js 4** (IndexedDB) for persistent data, **localStorage** for settings
- **vite-plugin-pwa** for offline-first PWA with Workbox caching
- **pnpm** as package manager

## Architecture

This is 宝宝助手 (BabyCare) — a Chinese-only pregnancy/baby care PWA with a Duolingo-inspired UI. All UI text is hardcoded in Chinese. No backend, no auth — everything is local to the device.

### Routing

Routes are defined in `src/App.tsx`. Two kinds:

- **Layout routes** (wrapped in `<Layout>` with bottom nav): `/`, `/history`, `/settings`, `/tools/*` home pages
- **Full-screen session routes** (no nav, no Layout): `/tools/kick-counter/session`, `/tools/contraction-timer/session/:sessionId`

When navigating away from sessions, use `navigate(path, { replace: true })` to prevent back-button confusion.

### Data Layer

- **Dexie database** (`src/lib/db.ts`): `KickCounterDB` with tables `sessions`, `contractionSessions`, `contractions`. Schema versions are incremental — always add a new `db.version(N+1)` when adding tables/indexes.
- **Settings** (`src/lib/settings.ts`): stored in localStorage under `babycare-settings`. Includes `goalCount`, `mergeWindowMinutes`, `darkMode`, `dueDate`.

### File Organization

- `src/components/` — reusable UI components (Layout, ProgressRing, TipBanner)
- `src/lib/` — pure utilities with no React dependencies (db, settings, time, haptics, tips, encouragements)
- `src/pages/` — route-level components
- `src/pages/tools/<feature>/` — each tool gets its own subdirectory (kick-counter, contraction-timer)

### Key Conventions

- Components are **default exports**: `export default function ComponentName()`
- Imports use **explicit `.ts`/`.tsx` extensions**
- Timestamps are **milliseconds** (`Date.now()`), IDs are **`crypto.randomUUID()`**
- No state management library — React hooks + local component state only
- Dark mode via `.dark` class toggle on `<html>`, not system preference

### Custom Theme

Duolingo-inspired color palette defined in `src/index.css`:
- Primary: `--color-duo-green: #58CC02`
- Accents: `duo-orange`, `duo-blue`, `duo-purple`, `duo-red`, `duo-yellow`
- Custom animations: `bounce-in`, `pulse-ring`, `float`, `slide-up`, `wiggle`

### Business Logic

- **Kick counter**: 5-minute merge window — first tap in a window increments `kickCount`, subsequent taps within the window are recorded but don't increment. Cardiff Count-to-10 method.
- **Contraction timer**: tracks duration + interval per contraction. 5-1-1 rule alert (contractions ≤5 min apart, ≥1 min long, for ≥1 hour).

### PWA

Configured in `vite.config.ts`. Display mode is `standalone` (full-screen like native). Safe area insets handled via CSS env variables (`--safe-area-top`, `--safe-area-bottom`).

## Roadmap Context

See `ROADMAP.md` for planned features. Phase 1 (hub + contraction timer) is in progress. Future phases include hospital bag checklist, feeding log, diaper tracking, sleep tracking, growth curves, and vaccine calendar.
