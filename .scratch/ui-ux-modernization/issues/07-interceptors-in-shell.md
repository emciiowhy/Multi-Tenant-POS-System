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

- [x] `OfflineIndicator` renders online/queued/offline + count and fires retry (jsdom).
- [x] The billing banner occupies a reserved shell slot — content shifts, no overlap/overflow (test asserts the slot, banner reuses `bannerState`).
- [x] Locked actions show the disabled + reason affordance via `Button` `blockedReason`.
- [x] The old per-page pending-sync pill is removed in favor of the shared indicator (POS page still shows queued state).

## Blocked by

- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`
- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`

## Done (red-green) — `3654a59`

All three states centralized in **one shell interceptor context**, reusing the
existing pure logic + outbox/replay seam (nothing reinvented):

- **`lib/shell/action-lock.ts`** (pure, node-tested) — `resolveActionLock({ banner })`
  → soft-locks gated actions when the billing banner is `trial_expired` /
  `past_due` / `blocked` (with a reason); `none` / `trial_ending` stay live.
  **Offline does NOT lock** — POS is offline-first (sales queue + replay); the
  offline state surfaces via the non-blocking `OfflineIndicator`.
- **`lib/shell/use-connectivity.ts`** — `useOnline()`, a thin `onlineManager`
  seam (the same source the Replay engine uses), kept isolated so it's mockable.
- **`components/ui/Interceptors.tsx`** — `InterceptorProvider` does the one
  subscription read (react-query) + connectivity + `useOutboxPending`, exposing
  `useInterceptors()` / `useActionLock()` (safe loading default outside a
  provider, so the AppShell stays QueryClient-free in its unit tests).
  `OfflineIndicator` (subtle dot when synced; queued → count + "syncing when
  online" + **Retry now** via `retrySync`; offline state), `BillingBannerSlot`
  (reserved in-flow `<div>` reusing `BillingBanner` — pushes content down, never
  overlays; hidden on `/billing`).

Wiring: `InterceptorProvider` wraps `AppShell` in the `(dashboard)` layout (above
the shell so the shell needs no QueryClient); `AppShell` mounts `OfflineIndicator`
in the header + `BillingBannerSlot` above the content region. `BillingChrome`
trimmed to just the 402→`/billing` redirect (banner moved to the slot). POS page:
**removed the per-page pending pill** (the shared header indicator now shows the
queued count) and moved checkout onto the `Button` primitive with
`blockedReason={lock.reason}` — checkout **freezes with a reason** during a
subscription lockout.

Tests: `action-lock` (2) + `Interceptors` (8) = **10 new**. Frontend suite
**189 passing**; workspace typecheck **8/8**.
