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

- [ ] On a 402 during replay, the engine stops draining and surfaces "subscription required" → `/billing`; the queue is preserved (entries stay pending, not failed).
- [ ] A 401 still routes to re-login (existing behaviour), handled distinctly from 402.
- [ ] Neither 401 nor 402 triggers a backoff-retry storm or discards queued batches; they replay after the block is resolved (still idempotent).
- [ ] Replay-engine unit tests are extended: an injected `submit` throwing 402 → the block handler is called, entries remain pending, and no retry is scheduled.

## Blocked by

- `.scratch/billing-subscription-gate/issues/03-subscription-gate-middleware.md`
