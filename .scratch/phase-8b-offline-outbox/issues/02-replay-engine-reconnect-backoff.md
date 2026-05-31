# Automatic idempotent replay on reconnect, with backoff

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/phase-8b-offline-outbox/PRD.md`

## What to build

Add the **Replay engine** — a deep module that drains the outbox to the server
whenever connectivity allows, idempotently and in order.

It pulls `pending()` entries and submits each batch **serially, oldest-first**,
through an injected `submit(events) => Promise<PosEventResult[]>`. Decision rules
(pure, testable):

- every result `applied` or `duplicate` → mark the entry applied (`duplicate`
  means a prior attempt already reached the server — idempotent success per
  ADR-0006);
- any result `rejected` → mark failed + flag (business rejection; not
  auto-retried);
- transport failure / 5xx (no results) → keep pending, increment attempts,
  retry with exponential backoff (capped, reset on success);
- `401` → pause, re-mint the access token via the existing route, resume; a dead
  session prompts re-login without losing the queue.

Replay is triggered on enqueue (if online), on the `online` event (via TanStack
Query's `onlineManager`), on a periodic tick, and via a manual "retry now"
control. The end-to-end demo: go offline, ring up several sales (all complete
locally), reconnect → the queue drains to zero.

## Acceptance criteria

- [x] With the device offline, multiple sales can be charged and all queue locally; each completes for the cashier.
- [x] On reconnect, the queue drains oldest-first, one batch at a time, and the pending badge returns to 0.
- [x] A replayed batch whose events were already applied (server returns `duplicate`) is treated as success — never double-applied.
- [x] A transport failure retains the entry, increments attempts, and retries with capped exponential backoff; a success resets the backoff.
- [x] A batch the server `rejected` for a business reason moves to a failed/flagged state and is not auto-retried.
- [x] A `401` during replay pauses the drain, re-mints the token, and resumes; a dead session prompts re-login and the queue survives.
- [x] A manual "retry now" flush is available.
- [x] Replay decision logic is unit-tested with an injected `submit` and fake timers / simulated online state (result interpretation, backoff scheduling, FIFO order, duplicate handling).

## Blocked by

- `.scratch/phase-8b-offline-outbox/issues/01-outbox-enqueue-and-persist.md`

## Comments

**Done (2026-05-31), red-green.** `lib/pos/replay/`: `replay-logic.ts` (pure `classifyResults` / `backoffDelay` / `isAuthError`) + `replay-engine.ts` (`ReplayEngine`: serial FIFO drain, applied/duplicate→applied, rejected→failed+continue, transport→`markRetry`+capped-exponential-backoff+stop, offline no-op, 401→`onAuthError`+stop, reconnect-triggered via `start()`, `flushNow()`). Added `Outbox.markRetry`. Wired: `getReplayEngine()` singleton (TanStack `onlineManager` + apiFetch submit + onAuthError→/login), started in `Providers`; `useChargeSale` now enqueues then `flushNow()` and derives `synced` from the entry status; a clickable "Pending sync · N · Retry" badge calls `flushNow()` (manual retry).

**14 new frontend tests** (replay-logic 7, replay-engine 7 with injected submit/online + fake timers; + the markRetry case) → 39 frontend tests total; workspace typecheck 8/8; full suite 8/8.

Note: the "re-mint token and resume" on 401 is handled transparently by `apiFetch` (it retries once with a fresh token); a 401 reaching the engine means the session is truly dead, so `onAuthError` sends the cashier to re-login and the queue stays in IndexedDB. As with issue 01, the engine/decision logic is unit-tested; the React wiring (Providers start, badge) is built + typechecked but has no component test yet (that jsdom/Testing-Library setup arrives with issue 04's UI work).
