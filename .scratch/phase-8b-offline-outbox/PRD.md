# PRD — Phase 8b: Offline-first POS mutation outbox

Status: ready-for-agent
Area: frontend/web (POS), ADR-0006 / ADR-0008 / ADR-0009
Depends on: Phase 8a (POS sell-flow UI) — shipped

## Problem Statement

A cashier on a Register often loses connectivity — mobile setups, flaky venue
wi-fi, a backend deploy mid-shift. Today the register's **Charge** action is an
online-only mutation: it builds an `order.open → order.fire → order.settle`
batch and POSTs it to the API. If the network is down, the request fails, the
sale doesn't complete, and the customer cannot be served. That directly violates
the product's core promise (ADR-0009: "never let a customer be falsely
refused") and the offline-first requirement (ADR-0008).

A cashier needs to keep ringing up sales when the connection drops, trust that
nothing is lost when the device reconnects or is reloaded, and never see a sale
applied twice.

## Solution

Introduce a durable, client-side **mutation outbox** on the Register.

Charging always succeeds locally and instantly: the sale's events are appended
to the outbox, a receipt is shown immediately, and the cart clears. A **replay
engine** drains the outbox to the API whenever connectivity is available —
on enqueue, on reconnect, and on a periodic tick — replaying each queued sale
idempotently so a partially-synced batch can never double-apply (ADR-0006).
The product catalog is persisted locally so the register is fully usable with
no network at all. Overselling is allowed and surfaced after sync, never
blocked (ADR-0009).

The cashier sees a small "pending sync (N)" indicator; it drains to zero on
reconnect. Sales that the server *rejects* for a business reason (e.g. a deleted
product) are flagged for attention rather than silently dropped.

## User Stories

1. As a cashier, I want Charge to complete even with no connection, so that I can serve the customer immediately.
2. As a cashier, I want a receipt to print/show for an offline sale, so that the customer has proof of purchase.
3. As a cashier, I want my offline sales to sync automatically when the connection returns, so that I don't have to do anything manual.
4. As a cashier, I want a visible count of sales not yet synced, so that I know the device still has work to flush.
5. As a cashier, I want the pending count to drain to zero after reconnecting, so that I can trust everything reached the server.
6. As a cashier, I want to keep ringing up multiple sales while offline, so that a queue of customers isn't blocked by the network.
7. As a cashier, I want the product grid to work with no connection, so that I can build a cart offline.
8. As a cashier, I want a sale I completed offline to survive an app reload or a device crash, so that revenue is never lost.
9. As a cashier, I want a sale that was interrupted mid-sync (some events accepted, some not) to finish syncing without charging the customer twice, so that the books stay correct.
10. As a cashier, I want to be warned when the server rejects one of my queued sales, so that I can resolve it instead of losing it.
11. As a cashier, I want to manually retry syncing, so that I can flush the queue without waiting for the timer.
12. As a cashier, I want to sell an item even if it appears out of stock while offline, so that I never refuse a paying customer (ADR-0009).
13. As a cashier, I want the order of my offline sales preserved on sync, so that the ledger reflects what actually happened in sequence.
14. As a cashier, I want sync to keep retrying a transient network failure with backoff, so that a brief blip doesn't strand a sale or hammer the server.
15. As a cashier, I want my queued sales scoped to the Company and Branch I'm signed into, so that they post to the right tenant.
16. As a cashier returning from a long offline stretch, I want the app to re-authenticate and then flush the queue, so that an expired access token doesn't drop my sales.
17. As a cashier, I want to know whether a shown receipt is provisional (offline) or confirmed (synced), so that I understand its status.
18. As a branch manager, I want to see that a Register has unsynced sales, so that I don't close the till before the queue flushes.
19. As a branch manager, I want overselling that happened offline to surface as an alert after sync, so that I can reconcile stock (ADR-0009).
20. As a developer, I want the outbox queue logic to be a deep module with a tiny interface over a storage port, so that I can unit-test it without a browser.
21. As a developer, I want the replay decision logic to be pure and injectable, so that I can test retry/backoff and result interpretation deterministically.
22. As a developer, I want replay to rely on the existing `client_uuid` idempotency contract, so that no backend changes are required (ADR-0006).
23. As a developer, I want the offline cache and outbox to share one IndexedDB-backed persistence layer, so that the register restores cleanly after reload.
24. As an account, I want a duplicate replay (same `client_uuid`) to be a no-op on the server, so that retries are always safe.

## Implementation Decisions

**No backend or schema changes.** The API already accepts an idempotent event
batch at the POS events endpoint and returns a per-event result list with
status `applied | duplicate | rejected`. `processBatch` already de-duplicates on
`(company_id, client_uuid)` and guards state transitions (ADR-0006). The outbox
is entirely a `frontend/web` concern. `@vendme/contracts` event/result shapes
are reused as-is.

**Module 1 — Outbox (deep module).** A durable FIFO queue of pending sale
batches over an injected store port. Conceptual interface:
- `enqueue(batch)` — append a new entry; dedupe on the batch's client id (re-enqueue is a no-op).
- `pending()` — entries in `pending`/`failed-retryable` state, oldest first.
- `markApplied(id)` / `markFailed(id, reason)` — terminal/flagged transitions.
- `subscribe(listener)` — notify on change (drives the pending-count UI).

Entry shape (conceptual): `{ id (client batch uuid), kind: "pos.sale", events: PosEvent[], status: "pending" | "applied" | "rejected", attempts, enqueuedAt, lastError? }`. The events array is the `open → fire → settle` sequence built at charge time, each event carrying its own `client_uuid` and a shared `orderClientUuid` (as in 8a).

**Module 2 — OutboxStore port + IndexedDB adapter.** The store is a port
(`load` / `save` / per-entry upsert+delete). The browser implementation is
**IndexedDB** via a thin wrapper (idb-keyval-style); an **in-memory** store
backs tests. A degraded **localStorage** fallback is used only when IndexedDB is
unavailable. The persisted QueryClient cache (product catalog) uses the same
IndexedDB layer so the register works fully offline (ADR-0008 `persistQueryClient`).

**Module 3 — Replay engine (deep module).** Drains `pending()` serially (one
batch at a time, FIFO) against an injected `submit(events) => Promise<PosEventResult[]>`.
Decision rules (pure, testable):
- Every result `applied` or `duplicate` → `markApplied`. (`duplicate` means a
  prior attempt already reached the server — idempotent success, ADR-0006.)
- Any result `rejected` → `markFailed(reason)`; not retried automatically
  (business rejection: forbidden, unknown product, order-not-fired). Surfaced to
  the cashier for reconciliation.
- Transport failure / 5xx (no result list) → leave `pending`, increment
  `attempts`, schedule a retry with **exponential backoff** (≈1s → 2s → … capped
  ~60s), reset on success.
- A `401` (token expired/refresh gone while offline) → pause replay, trigger a
  token re-mint via the existing access-token route; if the session itself is
  gone, prompt re-login, then resume.

Triggers: immediately on `enqueue` (if online), on the `online` event (via
TanStack Query's `onlineManager`), on a periodic tick, and on manual flush.

**Module 4 — Offline wiring.** Configure TanStack Query `networkMode` and
`onlineManager`; persist the QueryClient with the IndexedDB persister so the
products query is restored offline. The Charge handler is refactored: instead of
a direct POST (8a), it builds the batch, shows an **optimistic provisional
receipt** from local cart data + the client-side display subtotal (the tendered
amount), clears the cart, and `enqueue`s. Online, the replay drains immediately;
offline, it waits. A "pending sync (N)" badge subscribes to the outbox.

**Sync rules / reconciliation (ADR-0009).** The sell path never reads or blocks
on stock. Firing offline simply queues the movements; on sync the backend may
project negative on-hand and raise alerts over the existing `stock.changed`
realtime path — that surfacing lives in the inventory module, not here. The
outbox's only reconciliation duty is to flag *server-rejected* events. The
provisional receipt shows the client-computed total as the charged amount; once
synced, the canonical server receipt (authoritative totals at fire) is fetched;
if the server `grandTotal` differs from the tendered amount, the sale is flagged
for reconciliation rather than silently reconciled.

## Testing Decisions

Good tests assert external behavior through a module's public interface, not its
internals — feed inputs, assert outputs/observable state. Pure logic + injected
ports, no reliance on real timers/network where avoidable. Prior art in this
repo: `backend/api/src/modules/**/**.logic.test.ts`, and
`frontend/web/src/lib/realtime/apply-event.test.ts` /
`frontend/web/src/lib/pos/cart-logic.test.ts`.

Modules to test (all four were requested):

1. **Outbox queue logic** — over the in-memory store: enqueue + dedupe by batch
   id, status transitions (`pending → applied`, `pending → rejected`), `pending()`
   FIFO ordering, subscriber notification. Pure; mirrors `cart-logic.test.ts`.
2. **Replay engine decision logic** — with an injected fake `submit` and fake
   timers + simulated online/offline: all-applied → applied; any-rejected →
   failed+flagged and not retried; transport error → retained with incremented
   attempts and backoff; duplicate → treated as success; serial FIFO drain.
   Mirrors the pure-logic pattern; uses Vitest fake timers.
3. **IndexedDB adapter** — integration-style with a `fake-indexeddb` shim:
   round-trip persist/load of outbox entries, and that a queue survives a
   simulated reload (new store instance reads prior entries). Establishes the
   first frontend integration-test pattern (new dev dependency: `fake-indexeddb`).
4. **Offline wiring / UI** — component test (jsdom + Testing Library): Charge
   while offline shows a provisional receipt and increments the pending badge;
   simulating reconnect drains the queue and clears the badge. Establishes the
   first frontend component-test setup (new dev deps: `jsdom`,
   `@testing-library/react`; a Vitest jsdom environment for these files).

## Out of Scope

- Any backend or database change — the API is already idempotent (ADR-0006).
- Phase 8c (Shift open/close + cash drawer UI) and Phase 8d (returns/refunds UI).
- Negative-stock reconciliation tasks/alerts themselves — an inventory-module
  concern (ADR-0009); this PRD only guarantees the sell path never blocks and
  flags rejected events.
- Multi-tab / multi-Register coordination on the same device (two browser tabs
  sharing one outbox). Flagged in Further Notes.
- Service-Worker background sync (replaying while the app is closed). Replay runs
  while the register page is open.
- The Restaurant order lifecycle offline (KDS transitions, table state) — this
  PRD covers the POS sell path; the same outbox can be generalized later.

## Further Notes

- **Idempotency is the whole safety story.** Each event's `client_uuid` and the
  shared `orderClientUuid` make replay-after-partial-success safe; the backend
  returns `duplicate` for already-applied events. Do not generate new uuids on
  retry — persist them with the entry.
- **Ordering & concurrency:** drain FIFO and serially. The backend runs each
  event in its own company-scoped transaction, so serial replay needs no locking
  and preserves ledger order.
- **Token expiry offline:** the queued batch needs no token until replay; on
  reconnect the access token is re-minted via the existing route. A dead session
  surfaces as a re-login prompt; queued sales remain safe in IndexedDB.
- **Provisional vs confirmed receipt:** offline totals are client-computed
  (display) and equal the tendered amount; authoritative totals arrive on sync.
  Surface a clear provisional/confirmed state (user story 17).
- **Multi-tab risk:** two tabs on one terminal could double-drain the same IDB
  outbox. Out of scope now; a `BroadcastChannel`/leader-election or a per-entry
  claim is the future fix.
- **Generalization:** the Outbox + Replay engine are intentionally event-batch
  agnostic (`kind` field) so Restaurant/inventory mutations can use them later.

## Comments
