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

### Design System

Duolingo-inspired, flat, clean, and playful. Defined in `src/index.css` and applied via Tailwind utility classes throughout.

#### Core Principles

1. **No shadows** — Never use `shadow-*` classes on cards, containers, or buttons. The only exception is toggle switch thumbs (`shadow` on the circle).
2. **Border-based contrast** — Use soft borders to define card edges: `border border-gray-200 dark:border-gray-700/60`. This gives subtle depth without shadows.
3. **Bold typography** — Headlines use `font-extrabold`, labels use `font-bold`. The UI should feel confident and punchy.
4. **Flat color fills** — Buttons and accents use solid Duo palette colors, never gradients (except the hero banner which uses a subtle green-to-transparent gradient).

#### Color Palette (`src/index.css`)

| Token              | Hex       | Usage                                   |
|--------------------|-----------|------------------------------------------|
| `duo-green`        | `#58CC02` | Primary actions, kick counter, active states |
| `duo-green-dark`   | `#46a302` | Button bottom borders (pressed look)     |
| `duo-orange`       | `#FF9600` | Streaks, contraction timer, warnings     |
| `duo-blue`         | `#1CB0F6` | Export actions, informational accents     |
| `duo-purple`       | `#CE82FF` | Due date, import actions                 |
| `duo-red`          | `#FF4B4B` | Danger actions, stop buttons, alerts     |
| `duo-yellow`       | `#FFC800` | Celebrations, highlights                 |
| `duo-gray`         | `#E5E5E5` | Disabled states, separators              |

#### Cards

- Background: `bg-white dark:bg-[#16213e]`
- Border: `border border-gray-200 dark:border-gray-700/60`
- Radius: `rounded-2xl` (standard) or `rounded-3xl` (hero/featured)
- Padding: `p-5` (standard) or `p-4` (compact lists)
- No shadows ever

#### Stat Chips (Home Page)

Small cards with a colored top accent bar:
```
<div class="bg-white rounded-2xl overflow-hidden border border-gray-200">
  <div class="h-[3px] bg-duo-{color}" />  <!-- colored accent bar -->
  <div class="px-3 py-3 text-center">
    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LABEL</p>
    <p class="text-xl font-extrabold">EMOJI + VALUE</p>
  </div>
</div>
```

#### Section Headers

Uppercase, tiny, bold, gray — like Duolingo's "OVERVIEW" / "FRIEND STREAKS":
```
<p class="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
  SECTION NAME
</p>
```

#### Primary Action Buttons (CTAs)

Full-width, solid color, bottom border for depth (Duolingo-style pressed look):
```
<button class="w-full py-5 bg-duo-green text-white text-xl font-extrabold rounded-2xl border-b-4 border-duo-green-dark active:scale-95 transition-all">
```
- Green CTAs: `border-b-4 border-duo-green-dark`
- Orange CTAs: `border-b-4 border-amber-600`
- Red CTAs: `border-b-4 border-red-600`

#### Tool Cards (Home Grid)

Square aspect-ratio grid cards for tools:
- Available: `bg-white border-2 border-gray-200 rounded-2xl` with centered emoji (40px) + centered bold title
- Unavailable: `border-2 border-dashed border-gray-200 opacity-40` with "即将推出" badge
- No colored borders on tool cards — keep them neutral white

#### Grouped Lists (Duo "Friend Streaks" Pattern)

Multiple items wrapped in a single bordered card with thin internal dividers:
```
<div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
  {items.map((item, idx) => (
    <div key={item.id}>
      {idx > 0 && <div class="mx-4 border-t border-gray-100 dark:border-gray-700/40" />}
      <div class="px-4 py-3.5">...row content...</div>
    </div>
  ))}
</div>
```
Use this instead of individual bordered cards when showing a list of related items (session history, settings rows, etc.).

#### Tab Switcher (Duo Style)

Bottom-border accent on active tab, not a pill background:
```
<div class="flex border-b-2 border-gray-200 dark:border-gray-700/60">
  <button class="flex-1 pb-3 text-sm font-bold uppercase tracking-wider text-duo-green relative">
    Label
    <span class="absolute bottom-0 left-0 right-0 h-[3px] bg-duo-green rounded-full -mb-[2px]" />
  </button>
</div>
```

#### Page Headers

Bold, left-aligned, no emoji prefix:
```
<h1 class="text-2xl font-extrabold text-gray-800 dark:text-white">设置</h1>
```

#### Dark Mode Tokens

| Element      | Light               | Dark                   |
|-------------|----------------------|------------------------|
| Page bg     | `bg-gray-50`         | `bg-[#1a1a2e]`        |
| Card bg     | `bg-white`           | `bg-[#16213e]`        |
| Card border | `border-gray-200`    | `border-gray-700/60`  |
| Text primary| `text-gray-800`      | `text-white`           |
| Text muted  | `text-gray-400`      | `text-gray-500`        |
| Input bg    | `bg-gray-100`        | `bg-gray-800`          |

#### Animations (`src/index.css`)

- `animate-bounce-in` — entry pop for celebrations
- `animate-pulse-ring` — pulsing ring on active recording
- `animate-float` — gentle up/down float for mascot
- `animate-slide-up` — content reveal from below
- `animate-wiggle` — playful wiggle for attention

### Business Logic

- **Kick counter**: 5-minute merge window — first tap in a window increments `kickCount`, subsequent taps within the window are recorded but don't increment. Cardiff Count-to-10 method.
- **Contraction timer**: tracks duration + interval per contraction. 5-1-1 rule alert (contractions ≤5 min apart, ≥1 min long, for ≥1 hour).

### PWA

Configured in `vite.config.ts`. Display mode is `standalone` (full-screen like native). Safe area insets handled via CSS env variables (`--safe-area-top`, `--safe-area-bottom`).

## Roadmap Context

See `ROADMAP.md` for planned features. Phase 1 (hub + contraction timer) is in progress. Future phases include hospital bag checklist, feeding log, diaper tracking, sleep tracking, growth curves, and vaccine calendar.
