# Offline POS writes go through a bespoke durable outbox and replay engine

A POS terminal must complete sales and refunds while offline and sync them on reconnect, without ever double-applying (ADR-0006, ADR-0009). ADR-0008 anticipated reusing TanStack Query's mutation persistence for this. In practice POS **writes** go through a purpose-built **durable outbox** (one entry per sale/refund batch, persisted in IndexedDB) drained by a **replay engine**; TanStack Query's persisted cache is still used for **reads** (so the catalog works from a cold offline load), but not for writes. This ADR records that split and supersedes ADR-0008's "reuse the library's mutation machinery" assumption for the write path.

## Decisions

- **Durable, batch-keyed outbox.** Each queued unit is one batch (a sale's `open→fire→settle`, or a single refund) keyed by a batch id — the idempotency key for the whole batch — with every event also carrying its own `client_uuid` (ADR-0006). It is persisted in IndexedDB so a crash or cold reload never loses queued sales. The store is a small port (IndexedDB in the browser, in-memory in tests); the queue is one terminal's unsynced work, so whole-list load/save is acceptable.

- **Serial, idempotent replay with explicit outcome classes.** The engine drains pending entries FIFO when online and distinguishes four outcomes, each handled differently: an applied/duplicate batch is marked applied (a duplicate means a prior attempt already reached the server — never double-apply); a per-event **business rejection** fails just that batch and continues; a **transport failure** backs off (capped exponential) and retries; and a **lockout** — `401` after the transparent token re-mint (dead session) or `402` from the subscription gate (ADR-0012) — stops the drain and routes the user (re-login / billing) while leaving the queue **pending**, so it replays once the block clears. Pure decision logic (result classification, backoff, error classification) is separated and unit-tested; the engine's scheduling and connectivity are injected.

## Considered options

- **TanStack Query mutation persistence (as ADR-0008 anticipated).** Rejected *for writes*: a generic mutation-retry cache has opaque retry semantics and no first-class distinction between a business rejection (fail the batch), a transport failure (back off), and a lockout (stop, preserve) — and it models single mutations awkwardly for a multi-event POS batch with per-event results. It remains the right tool for **reads** (persisted query cache over IndexedDB), which is what we use.
- **Service-worker Background Sync.** Rejected: coarse, inconsistent across browsers, hard to test, and unable to express per-batch business outcomes.

## Consequences

- **This refines ADR-0008**: server *read* state uses TanStack Query (persisted); POS *writes* use the bespoke outbox + replay engine. Both honor the `client_uuid` idempotency contract with the append-only ledger (ADR-0006).
- The outbox/replay is the client-side integration point for the gate's `402` (ADR-0012) and the re-login `401`; oversell surfacing and reconciliation (ADR-0009) happen after a batch replays.
- A very high-volume terminal would outgrow whole-list persistence and need an incremental store — an accepted, deferred cost.
