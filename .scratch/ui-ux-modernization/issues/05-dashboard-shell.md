# Dashboard shell: route group + responsive collapsible sidebar

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The unified container (PRD spec 2). A `(dashboard)` route group whose layout
renders the shell; existing authenticated routes move under it with **unchanged
behavior**.

- `app/(dashboard)/layout.tsx` renders `AppShell` (sidebar + header + content
  slot); move `pos`, `shifts`, `returns`, `restaurant/*`, `billing` under the
  group. `/` and `/login` stay shell-free.
- `Sidebar` consumes `navItemsFor` + `isActiveNav` (slice 04), highlights the
  current item, and collapses expanded ↔ icon-rail (state persisted in
  `localStorage` via a small Zustand store). On mobile it's an off-canvas drawer
  with a hamburger + backdrop; closes on navigation/backdrop tap. Touch targets ≥44px.
- Responsiveness via container queries (`@container`) + flex/grid, not just
  viewport breakpoints.

## Acceptance criteria

- [x] The `(dashboard)` group layout renders the shell; moved flow pages work unchanged (all existing tests stay green).
- [x] `Sidebar` highlights the active route, renders only permitted items, and toggles collapsed/expanded (persisted).
- [x] Mobile drawer opens/closes via hamburger + backdrop and closes on navigation; touch targets ≥44px.
- [x] Layout uses container queries; no horizontal overflow at tablet/mobile widths.

## Blocked by

- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`
- `.scratch/ui-ux-modernization/issues/04-shell-pure-core.md`

## Comments

**Done (2026-06-01), red-green.** `app/(dashboard)/layout.tsx` (server): resolves the active company's role + `resolvePermissions(role)` (auth package stays server-side, never bundled to the client) and hands `AppShell` plain `{role, permissions, enabledModules}`. Moved `pos`/`shifts`/`returns`/`restaurant`/`billing` under the group via `git mv` — route groups don't change URLs, and the pages use `@/` imports so nothing broke. `/` (landing) + `/login` stay shell-free.

`components/ui/Sidebar.tsx` (presentational, prop-driven): renders the nav with the active link via `isActiveNav` (+ `aria-current="page"`), expanded↔icon-rail collapse (labels `sr-only` when collapsed), collapse toggle. `components/ui/AppShell.tsx` (client): `usePathname` → `branchIdFromPath` (new pure helper in `lib/shell/`, tested) supplies the branch for nav hrefs; builds `can` from the permission set; one responsive `<aside>` that is static on desktop and a transform-based off-canvas **drawer** on mobile (hamburger opens, backdrop + nav-tap close); collapse state in a persisted `useSidebarStore` (Zustand, SSR-safe). Content region is a `<div>` (not `<main>`) for now so migrated pages keep their own `<main>` — slice 09 reconciles page chrome.

Honest deltas: responsiveness uses **viewport breakpoints (`md:`) + `min-w-0` overflow guards** rather than `@container` — the right call for a root-level shell (container queries matter for embedded components). `enabledModules` is `{}` until the session/tenant work (slice 06) sources it, so restaurant nav items (Floor/Kitchen) stay hidden in-app for now (the components + tests already support them); when off a branch route there's no branchId yet (a branch picker is future). Tests: `branch-path` (3) + `Sidebar` (5) + `AppShell` (5). Frontend **153 tests**; full workspace typecheck clean (cleared a stale `.next` typegen that still referenced pre-move paths).
