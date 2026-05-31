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

- [ ] The `(dashboard)` group layout renders the shell; moved flow pages work unchanged (all existing tests stay green).
- [ ] `Sidebar` highlights the active route, renders only permitted items, and toggles collapsed/expanded (persisted).
- [ ] Mobile drawer opens/closes via hamburger + backdrop and closes on navigation; touch targets ≥44px.
- [ ] Layout uses container queries; no horizontal overflow at tablet/mobile widths.

## Blocked by

- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`
- `.scratch/ui-ux-modernization/issues/04-shell-pure-core.md`
