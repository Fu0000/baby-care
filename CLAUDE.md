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
- **@base-ui/react** — headless UI components (Tabs, Collapsible, Dialog, AlertDialog, Progress, NumberField, Toggle, ToggleGroup, ScrollArea)
- **react-day-picker** — date picker (zh-CN locale, used in bottom sheet Dialog)
- **sileo** — toast notifications
- **Dexie.js 4** (IndexedDB) for persistent data, **localStorage** for settings
- **vite-plugin-pwa** for offline-first PWA with Workbox caching
- **Nucleo icons** — `nucleo-glass` (nav), `nucleo-ui-outline-duo-18` (feature icons)
- **pnpm** as package manager

## Architecture

This is 宝宝助手 (BabyCare) — a Chinese-only pregnancy/baby care PWA with a Duolingo-inspired UI. All UI text is hardcoded in Chinese. No backend, no auth — everything is local to the device.

### Routing

Routes are defined in `src/App.tsx`. Two kinds:

- **Layout routes** (wrapped in `<Layout>` with bottom nav + ScrollArea): `/`, `/history`, `/settings`, `/tools/*` home pages
- **Full-screen session routes** (no nav, no Layout): `/tools/kick-counter/session`, `/tools/contraction-timer/session/:sessionId`

When navigating away from sessions, use `navigate(path, { replace: true })` to prevent back-button confusion.

### Data Layer

- **Dexie database** (`src/lib/db.ts`): `KickCounterDB` with tables `sessions`, `contractionSessions`, `contractions`. Schema versions are incremental — always add a new `db.version(N+1)` when adding tables/indexes.
- **Settings** (`src/lib/settings.ts`): stored in localStorage under `babycare-settings`. Includes `goalCount`, `mergeWindowMinutes`, `colorMode`, `dueDate`. Also exports helpers `getDaysUntilDue()` and `getWeeksPregnant()`.

### File Organization

- `src/components/` — reusable UI components (Layout, StickyHeader, ProgressRing, TipBanner)
- `src/lib/` — pure utilities with no React dependencies (db, settings, time, haptics, tips, encouragements)
- `src/pages/` — route-level components
- `src/pages/tools/<feature>/` — each tool gets its own subdirectory (kick-counter, contraction-timer)

### Key Conventions

- Components are **default exports**: `export default function ComponentName()`
- Imports use **explicit `.ts`/`.tsx` extensions**
- Timestamps are **milliseconds** (`Date.now()`), IDs are **`crypto.randomUUID()`**
- No state management library — React hooks + local component state only
- Color mode via `.dark` class toggle on `<html>` — supports system/light/dark (see `applyColorMode()`)
- Use `sileo.success()` / `sileo.error()` for user feedback instead of `alert()`

### Base UI Component Usage

The app uses `@base-ui/react` headless components throughout. Key patterns:

| Component | Where Used | Notes |
|-----------|-----------|-------|
| `Tabs` | History.tsx | `Tabs.Indicator` with dynamic color (green/orange) |
| `Collapsible` | History.tsx | Accordion-style session expand/collapse with height animation |
| `Dialog` | KickSession.tsx, Settings.tsx | Completion overlay, date picker bottom sheet |
| `AlertDialog` | ContractionSession.tsx, Settings.tsx | 5-1-1 rule alert, clear data confirmation |
| `Progress` | KickSession.tsx | Kick count progress bar |
| `NumberField` | Settings.tsx | Goal count stepper (1-50) |
| `ToggleGroup` + `Toggle` | Settings.tsx | Segmented controls (merge window, color mode) |
| `ScrollArea` | Layout.tsx | Main content scroll with custom scrollbar |

Style active states via `data-[pressed]`, `data-[selected]`, `data-[active]` attributes. Animations via `data-[starting-style]` / `data-[ending-style]`.

### Design System

Duolingo-inspired, flat, clean, and playful. Defined in `src/index.css` and applied via Tailwind utility classes throughout.

#### Core Principles

1. **No shadows** — Never use `shadow-*` classes on cards, containers, or buttons.
2. **Border-based contrast** — Use soft borders to define card edges: `border border-gray-200 dark:border-gray-700/60`.
3. **Bold typography** — Headlines use `font-extrabold`, labels use `font-bold`.
4. **Flat color fills** — Buttons and accents use solid Duo palette colors, never gradients (except the hero banner).

#### Color Palette (`src/index.css`)

| Token              | Hex       | Usage                                   |
|--------------------|-----------|------------------------------------------|
| `duo-green`        | `#58CC02` | Primary actions, kick counter, active toggle states |
| `duo-green-dark`   | `#46a302` | Button bottom borders (pressed look)     |
| `duo-orange`       | `#FF9600` | Streaks, contraction timer, warnings     |
| `duo-blue`         | `#1CB0F6` | Kick counter icon, informational accents |
| `duo-purple`       | `#CE82FF` | Due date, date picker accent             |
| `duo-red`          | `#FF4B4B` | Danger actions, stop buttons, alerts     |
| `duo-yellow`       | `#FFC800` | Celebrations, highlights                 |
| `duo-gray`         | `#E5E5E5` | Disabled states, separators              |

#### Cards

- Background: `bg-white dark:bg-[#16213e]`
- Border: `border border-gray-200 dark:border-gray-700/60`
- Radius: `rounded-2xl` (standard) or `rounded-3xl` (hero/featured)
- Padding: `p-5` (standard) or `p-4` (compact lists)
- No shadows ever

#### Sticky Header (`StickyHeader.tsx`)

All scrollable pages use the `StickyHeader` component — `sticky top-0` with 4-layer progressive backdrop blur (1px → 2px → 4px → 8px), each masked to a vertical band for smooth fade-out. Transparent background, no solid color.

```tsx
<StickyHeader>
  <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white text-center">Title</h1>
</StickyHeader>
```

For sub-pages with back button:
```tsx
<StickyHeader>
  <div className="relative flex items-center justify-center">
    <button className="absolute left-0 ...">← 返回</button>
    <h1 className="text-xl font-extrabold ...">Title</h1>
  </div>
</StickyHeader>
```

#### Stat Capsules (Home Page)

Pill-shaped tags with tinted backgrounds:
```
<div class="flex items-center gap-1.5 bg-duo-orange/10 rounded-full px-3.5 py-2">
  <span class="text-sm">🔥</span>
  <span class="text-sm font-extrabold text-duo-orange">{value}</span>
  <span class="text-xs font-bold text-gray-500 dark:text-gray-400">label</span>
</div>
```
Label text uses `text-gray-500 dark:text-gray-400` (not colored) for accessibility.

#### Featured Due Date Card

Full-width rounded card above stat pills:
```
<div class="flex items-center justify-between rounded-2xl px-5 py-3.5 bg-duo-purple/10">
  <div> <!-- label + weeks --> </div>
  <span class="text-2xl font-extrabold text-duo-purple">{days}</span>
</div>
```

#### Section Headers

Uppercase, tiny, bold, gray — like Duolingo's "OVERVIEW":
```
<p class="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
  SECTION NAME
</p>
```

#### Primary Action Buttons (CTAs)

Full-width, solid color, bottom border for depth:
```
<button class="w-full py-5 bg-duo-green text-white text-xl font-extrabold rounded-2xl border-b-4 border-duo-green-dark active:scale-95 transition-all">
```

#### Segmented Controls (ToggleGroup)

iOS-style segmented picker with shared background track:
```tsx
<ToggleGroup className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
  <Toggle className="flex-1 py-2 rounded-[10px] text-sm font-bold text-center ... data-[pressed]:bg-duo-green data-[pressed]:text-white">
    Label
  </Toggle>
</ToggleGroup>
```

#### Grouped Lists (Duo Pattern)

Multiple items in one card with dividers:
```
<div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
  {items.map((item, idx) => (
    <>
      {idx > 0 && <div class="mx-5 border-t border-gray-100 dark:border-gray-700/40" />}
      <button class="w-full px-5 py-4 flex items-center justify-between ...">
    </>
  ))}
</div>
```

#### Bottom Sheet Dialog

For pickers and confirmations that slide up from bottom:
```tsx
<Dialog.Popup className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-2 pt-5 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
  <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" /> <!-- drag handle -->
  ...
</Dialog.Popup>
```

#### Floating Dock (Layout)

Bottom nav with concentric corners. Outer `rounded-[30px]` = inner icon `rounded-full` (24px) + padding (6px).

- Icons: 30px Nucleo glass icons
- Gap: `gap-2`, padding: `px-1.5 py-1.5`
- PWA: `pwa:bottom-0` (flush to screen edge)
- Browser: `bottom-4`
- Backdrop: `bg-white/80 backdrop-blur-xl border border-gray-200/70`

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

- **Kick counter**: Configurable merge window (3/5/10 min) — first tap in a window increments `kickCount`, subsequent taps within the window are recorded but don't increment. Cardiff Count-to-10 method.
- **Contraction timer**: tracks duration + interval per contraction. 5-1-1 rule alert (contractions ≤5 min apart, ≥1 min long, for ≥1 hour).
- **Smart tool ordering**: `getWeeksPregnant()` determines tool grid order. Before 28 weeks → contraction timer first. 28+ weeks → kick counter first. Past due date → contraction timer first.

### PWA

Configured in `vite.config.ts`. Display mode is `standalone` (full-screen like native). Safe area insets handled via CSS env variables (`--safe-area-top`, `--safe-area-bottom`). Custom variant `pwa:` targets `@media (display-mode: standalone)`.

## Tool Usage

- **Always use Context7 MCP** (`resolve-library-id` → `query-docs`) when needing library/API documentation, code generation, setup or configuration steps — without the user having to explicitly ask. This ensures up-to-date docs are used instead of relying on training data.

## Roadmap Context

See `docs/ROADMAP.md` for planned features. Phase 1 (hub + contraction timer) and Phase 1.5 (UI polish + Base UI migration) are complete. Next up is Phase 2 (hospital bag checklist).
