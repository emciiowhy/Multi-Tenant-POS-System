# TanStack Query for server state, Zustand for client state

Client state is split by ownership. **TanStack Query** owns all server-derived state: caching, background refetch, optimistic mutations, and — critically for offline-first POS — persisted query/mutation state with a retry queue (`persistQueryClient` + a mutation outbox). **Zustand** owns ephemeral client state: the live POS cart, UI toggles, and per-terminal state.

## Why

- The two kinds of state have different lifecycles; using one tool for both (Redux Toolkit) adds boilerplate without benefit at this team size.
- TanStack Query's offline persistence and mutation replay map directly onto the POS outbox pattern (events carry `client_uuid`, ADR-0006), so the offline-first requirement reuses library machinery instead of bespoke sync code.
- Zustand's single-store model is simpler to reason about for one cohesive cart than Jotai's atoms; Jotai was a close, acceptable alternative.

## Consequences

- The POS cart is intentionally *not* in TanStack Query — it is local, ephemeral, and only produces server events on fire/settle.
- Mutation outbox + `client_uuid` idempotency is the contract between client and the append-only ledger; both sides must honor it.
- **Refinements after implementation:** the offline *write* path turned out bespoke rather than reusing TanStack Query's mutation persistence — **ADR-0013** records and supersedes that part of this decision (the persisted query *cache* is still used for reads). And the realtime protocol that applies server deltas into this cache is **ADR-0014**.
