# Interceptors: offline indicator + billing-banner slot

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

Standardize the two cross-cutting states into the shell (PRD spec 4), reusing the
existing logic — not reinventing it.

- `OfflineIndicator` in the header, driven by `offlineIndicatorState` (slice 04)
  from `onlineManager` + the outbox `pendingCount`. Subtle dot; when queued shows
  a count and "N change(s) queued — syncing when online" with a "Retry now"
  (existing replay `flushNow`/`retrySync`). Unifies the per-page POS pending pill.
- Move `BillingBanner` (ADR-0012, reuse `bannerState`) into a **shell banner slot
  that reserves layout space** (pushes content down, never overlays) so geometry
  never breaks. Hard 402 still routes to `/billing` via the existing redirect.
- Wire the `Button` `blockedReason` (slice 02) so locked actions during a
  subscription lockout or offline sync pause render disabled with a reason.

## Acceptance criteria

- [ ] `OfflineIndicator` renders online/queued/offline + count and fires retry (jsdom).
- [ ] The billing banner occupies a reserved shell slot — content shifts, no overlap/overflow (test asserts the slot, banner reuses `bannerState`).
- [ ] Locked actions show the disabled + reason affordance via `Button` `blockedReason`.
- [ ] The old per-page pending-sync pill is removed in favor of the shared indicator (POS page still shows queued state).

## Blocked by

- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`
- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
