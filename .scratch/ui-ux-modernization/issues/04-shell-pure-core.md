# Shell pure-core: nav model, active state, offline indicator logic

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The pure decision functions the shell components consume — built and tested
before any layout, so what shows / what's highlighted / what the indicator says
are provably correct.

- `navItemsFor({ role, enabledModules })` → ordered `{ key, label, icon, href }[]`:
  restaurant items appear only when the `restaurant` module is enabled (mirrors
  the backend module seam, ADR-0005); role-gated items hide for roles lacking them.
- `isActiveNav(pathname, href)` → prefix-aware active match (e.g. `/pos/:branch`
  highlights "POS"; no false positives across siblings).
- `offlineIndicatorState({ online, pendingCount })` → `{ kind: "online" | "queued"
  | "offline"; count }`.

## Acceptance criteria

- [x] `navItemsFor` unit-tested: restaurant gating, role gating, stable order — RED first.
- [x] `isActiveNav` unit-tested: exact + nested-prefix matches, no sibling false positives.
- [x] `offlineIndicatorState` unit-tested across online/queued/offline + count.
- [x] All three are pure (no React/DOM) and live under `lib/shell/`.

## Blocked by

None - can start immediately (pure; the shell in slice 05 consumes it).

## Comments

**Done (2026-06-01), red-green.** Three pure, dependency-free modules under `lib/shell/`:
- `nav-model.ts` `navItemsFor(ctx, can)` → ordered `{key,label,href}[]`. Restaurant items gated by `enabledModules.restaurant`; permission gating via an **injected `can` predicate** (so the function stays dependency-free *and* the client shell won't bundle `@vendme/auth`'s server-only code — slice 05 supplies the real `can`). Branch-scoped destinations (`/pos/:b`, `/shifts/:b`, `/returns/:b`, `/restaurant/floor|kds/:b`) are omitted when there's no active `branchId` rather than linking to a broken path; Billing is ungated + always shown. Order: pos, shifts, returns, floor, kds, billing.
- `nav-active.ts` `isActiveNav(pathname, href)` — exact or nested-child match, no sibling-prefix false positive (`/pos/b12` ≠ under `/pos/b1`), `"/"` matches only itself.
- `offline-indicator.ts` `offlineIndicatorState({online, pendingCount})` → `{kind: online|queued|offline, count, tone}` (offline/queued = warning, online = neutral); count sanitized to a non-negative integer.

Note: `Inventory` is intentionally not in the nav model yet — there is no frontend inventory page (only the `/v1/inventory` API); it joins the nav when a page exists. Tests: `nav-model` (6) + `nav-active` (5) + `offline-indicator` (4). Frontend **140 tests**, typecheck clean.
