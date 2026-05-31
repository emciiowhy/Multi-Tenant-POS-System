# Charge enqueues to a durable, reload-surviving outbox

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/phase-8b-offline-outbox/PRD.md`

## What to build

Make the Register's **Charge** action write through a durable **outbox** instead
of POSTing the sale directly.

When the cashier charges a cart, the `order.open → order.fire → order.settle`
batch (built as in Phase 8a, each event carrying its `client_uuid` and a shared
`orderClientUuid`) is appended as a single entry to the **Outbox** — a deep
module with a small interface (`enqueue` / `pending` / `markApplied` /
`markFailed` / `subscribe`) over a storage **port**. The browser store
implementation is **IndexedDB**; an in-memory store backs tests. The cart clears
and a provisional receipt is shown immediately. A "pending sync (N)" indicator
on the Register reflects the live queue length via subscription. Reloading the
page restores the queue from IndexedDB.

For this slice, replay is intentionally naive: when online, a newly enqueued
sale is posted once to the POS events endpoint and marked applied on success.
(Reconnect handling, backoff, and rejection handling come in the next slice.)

The sale is scoped to the cashier's active Company and Branch. The sell path
must not consult or block on stock (ADR-0009).

## Acceptance criteria

- [x] Charging a cart enqueues exactly one outbox entry holding the open/fire/settle events with their `client_uuid`s and shared `orderClientUuid`; the cart clears and a provisional receipt shows.
- [x] The outbox persists to IndexedDB and is fully restored after a page reload — no entries lost.
- [x] A "pending sync (N)" indicator reflects the queue length and updates as entries are added/applied.
- [x] When online, a freshly enqueued sale is posted to the POS events endpoint and marked applied on success; the badge returns to 0.
- [x] Enqueuing the same batch id twice is a no-op (dedupe).
- [x] Outbox queue logic is unit-tested over the in-memory store (enqueue + dedupe, status transitions, FIFO `pending` ordering, subscriber notification), mirroring the existing `*.logic.test.ts` pattern.
- [x] The IndexedDB adapter has an integration test (persist/load round-trip; a fresh store instance reads entries written before a simulated reload) using a `fake-indexeddb` shim.

## Blocked by

None - can start immediately.

## Comments

**Done (2026-05-31).** Built red-green. Deep modules: `lib/pos/outbox/` (Outbox + store port, in-memory + IndexedDB adapters via idb-keyval) and `lib/pos/build-sale-batch.ts`; UI: `getOutbox()` browser singleton, `useOutboxPending` (SSR-safe `useSyncExternalStore`), `useChargeSale` (enqueue → naive online drain), pending-sync badge + provisional/confirmed receipt on the Register. **24 frontend tests green** (Outbox 7, IndexedDB adapter 4 via fake-indexeddb, buildSaleBatch 4, + prior 9); workspace typecheck 8/8; full suite 8/8.

Note: the four testable units (Outbox queue, IDB adapter, buildSaleBatch) have unit/integration tests as required. The React wiring (badge updates, charge flow, provisional receipt — criteria 1/3/4) is built and typechecks but is **not** covered by an automated component test; that jsdom + Testing Library setup is the "offline wiring/UI" test in the PRD, slated with the later slices. The naive single-attempt online drain is intentionally minimal here — issue 02 (Replay engine) replaces it with reconnect handling + backoff.
