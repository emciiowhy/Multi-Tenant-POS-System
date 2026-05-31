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

- [ ] Flow pages and existing components render via the shared primitives/tokens; no remaining hardcoded button/card literals in migrated files.
- [ ] Every existing component/page test stays green (no behavior change).
- [ ] Loading and status affordances use `Skeleton` / `Badge`.
- [ ] Workspace typecheck clean; full frontend suite green.

## Blocked by

- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`
- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`
- `.scratch/ui-ux-modernization/issues/07-interceptors-in-shell.md`
