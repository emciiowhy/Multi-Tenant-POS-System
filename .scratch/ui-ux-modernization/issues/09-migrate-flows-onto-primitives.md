# Migrate existing flows + components onto primitives & shell

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

Finish the standardization: refactor the existing flow pages and components to
the new primitives/tokens and the shell. Presentational only — **behavior and
tests stay green**.

- Flow pages (`pos`, `shifts`, `returns`, `restaurant/floor`, `billing`, `login`)
  swap inline buttons/inputs/cards for `Button` / `Input` / `Card` / `Badge` /
  `Skeleton` and token classes.
- Existing components (`AttentionBanner`, `SaleReceipt`, `CloseShiftResult`,
  `BillingBanner`) re-skinned onto primitives without behavior change.
- Replace ad-hoc loading text with `Skeleton`; replace status text with `Badge`.

## Acceptance criteria

- [x] Flow pages and existing components render via the shared primitives/tokens; no remaining hardcoded button/card literals in migrated files.
- [x] Every existing component/page test stays green (no behavior change).
- [x] Loading and status affordances use `Skeleton` / `Badge`.
- [x] Workspace typecheck clean; full frontend suite green.

## Blocked by

- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`
- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`
- `.scratch/ui-ux-modernization/issues/07-interceptors-in-shell.md`

## Done (refactor) — `f5a70a9`

- **Landmark reconciled.** `AppShell`'s content region is now the single `<main>`;
  every `(dashboard)` page dropped its own `<main>` + `min-h-screen` + page-bg and
  flows into the shell content region (the `Centered` loading/error helpers became
  token `<div>`s). `/login` and `/` stay shell-free and keep their own `<main>`.
- **Components re-skinned onto tokens (behavioral tests stay green):**
  `AttentionBanner` (danger tokens), `SaleReceipt` (`Badge` pill + `Button`),
  `CloseShiftResult` (`Button`; balanced/over/short → success/warning/danger),
  `BillingBanner` (warning tokens; kept the plain `<a href="/billing">` its test
  asserts).
- **Flow pages onto primitives + tokens:** POS (`DataGridCard` tiles, `Button`
  tenders + checkout, token cart/inputs), Shifts (`Card` surfaces, `Input` for
  float/counted, `Button` open/add/close, token `<select>`), Returns (`Card` rows,
  `Badge` "refunded", `Input`/`Button` refund modal — and **removed its leftover
  per-page pending pill**, now unified into the shell `OfflineIndicator`), Billing
  (`Card`, `Button` subscribe/manage, `Badge` status, `Skeleton` loading), Login
  (`Card` + `Input` + `Button`).

### Documented exceptions (intentional, not "unmigrated")
- **Floor plan** keeps its four-state table `STATUS_COLOR` (free/seated/ordered/
  bill) — a domain visualization that needs four distinct hues the 4 semantic UI
  tokens don't provide (no blue/fuchsia). Its chrome (containers, headers, legend
  text) is tokenized.
- **KDS** is a deliberately dark, high-contrast kitchen board and is **not in this
  issue's flow-page list** (it's the resumption target). Only its `<main>` landmark
  was reconciled; the fuller migration travels with the KDS module work.

Full frontend suite **200 passing**; workspace typecheck **8/8**. (No new tests:
this is a behavior-preserving refactor — the components keep their behavioral
suites and the pages render through already-tested primitives + pure cores.)
