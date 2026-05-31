# Offline outbox: handle 401/402 lockout without losing the queue

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

Align the offline replay engine (Phase 8b) with the subscription gate. When a
Company is blocked, the replay engine's `submit` gets a **402**. A 402 is neither
a transport error (must not back off and retry forever) nor a per-event business
rejection (must not mark the batch failed/discarded). It is handled like the
existing **401** branch: stop draining and surface a "subscription required"
prompt that routes to `/billing` — while the queued batches stay pending and
replay (idempotently, via `client_uuid`) once billing is restored.

- Distinguish 402 (billing block → `/billing`) from 401 (auth → re-login).
- Neither marks entries failed nor discards them; both leave the queue intact.

## Acceptance criteria

- [x] On a 402 during replay, the engine stops draining and surfaces "subscription required" → `/billing`; the queue is preserved (entries stay pending, not failed).
- [x] A 401 still routes to re-login (existing behaviour), handled distinctly from 402.
- [x] Neither 401 nor 402 triggers a backoff-retry storm or discards queued batches; they replay after the block is resolved (still idempotent).
- [x] Replay-engine unit tests are extended: an injected `submit` throwing 402 → the block handler is called, entries remain pending, and no retry is scheduled.

## Blocked by

- `.scratch/billing-subscription-gate/issues/03-subscription-gate-middleware.md`

## Comments

**Done (2026-06-01), red-green.** `replay-logic.ts` gained `isBillingError(err)` (status 402) alongside `isAuthError` (both via a shared `statusOf`). `ReplayEngine` gained an `onBillingRequired?` dep and a 402 branch in `flush()`'s catch, ordered right after the 401 branch and before the transport branch: it calls `onBillingRequired` and `return`s — so it neither `markFailed`s (business rejection) nor `markRetry`s + schedules backoff (transport). The queue stays pending and replays once billing is restored (idempotent via `client_uuid`, ADR-0006). The real engine (`replay/index.ts`) wires `onBillingRequired` to `notifyBillingRequired("subscription_required")` so the existing `BillingRedirect` listener routes to `/billing`; `apiFetch` already fires the same signal on the 402, so the redirect is robust either way (idempotent — no-ops if already on /billing). Two new replay-engine tests: a 402 calls the handler, leaves the entry `pending`/`attempts:0`, and schedules no retry (timers advanced 60s, `submit` still called once); and 402 is handled distinctly from 401 (billing handler fires, auth handler does not). Frontend **87 tests**, typecheck clean across 8 packages.

This was the last slice — the ADR-0005 v1 billing/subscription gate is complete end-to-end (policy → webhook reducer → gate middleware → trial seeding/backfill → Stripe service/routes → frontend UI/interceptor → offline-outbox alignment).
