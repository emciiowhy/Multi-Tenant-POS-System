# Realtime delivers precise deltas, applied in place into the query cache

Layered on the Socket.IO transport (ADR-0007), this is the realtime *application protocol*: domain services publish a delta when a mutation commits; the gateway broadcasts it to tenant-scoped rooms; the client applies each delta **in place** into the TanStack Query cache (`setQueryData`) rather than invalidating and refetching. ADR-0007 chose the transport and ADR-0008 chose state ownership; this records how deltas actually flow and are applied (the code comments that point delta-apply at ADR-0008 mean *this* decision).

## Decisions

- **A transport-agnostic in-process bus.** A service publishes a `{ companyId, branchId, event }` envelope to a bus that imports no socket.io; the gateway is the single place that translates envelopes into room broadcasts. Domain code thus carries no realtime dependency and stays unit-testable, and the bus is injectable. One bus per process is correct even with the Redis adapter (ADR-0007): cross-instance fan-out happens at the Socket.IO layer, so each instance publishes locally and the adapter mirrors the resulting room emit.

- **Precise deltas, not refetch.** The client applies each change with a pure function (advance a KDS ticket's status, flip a table's status) via `setQueryData`. The single exception is an entity it has never seen — a freshly fired ticket the lean event can't fully carry — which triggers one *targeted* invalidate to materialise it. Under POS/KDS message volume, applying cheap deltas avoids refetch storms, and the apply functions are pure and unit-tested.

- **The room name is the tenant boundary.** `companyId` comes only from the verified handshake claim (the access JWT presented on connect, ADR-0004); every room name is built with that `companyId`, so a socket can only ever join rooms in its own tenant — the realtime analog of the RLS `app.company_id` boundary (ADR-0002).

- **Branch scope is client-requested, server-validated.** The JWT carries `company` + `role` but no branch, yet rooms are per-branch, so the client requests a `branchId` and the server validates it (RLS-scoped lookup + the membership branch pin). It is only ever a scope-*down*, never a way to widen access.

- **Connect-time auth, revocation eviction.** A connection authenticates once at handshake and persists; a revoked session's live sockets are force-disconnected (riding the Redis revocation pub/sub), rather than re-authenticating periodically over the socket.

## Considered options

- **Invalidate-and-refetch on every event.** Rejected: a refetch per delta is wasteful and storms the API at POS/KDS volume; precise in-place updates are cheaper and keep the screen steady. Refetch is kept only as the fallback for an unseen entity.
- **Auto-join every allowed branch / put `branchId` in the JWT.** Rejected: the former is noisy and over-broad; the latter touches the NextAuth minting path and the ADR-0004 claim set for no real gain.
- **Periodic re-auth over the socket.** Rejected: more client/server machinery and a re-auth event in the contract; eviction-on-revocation achieves the security goal with less.

## Consequences

- Each lean event type needs a corresponding pure apply function on the client; anything not applicable from its payload falls back to a single targeted invalidate, never a blanket refetch.
- The bus interface and the branch authorizer are injected, so services and the gateway are testable without a live socket or Postgres.
- This refines the realtime notes in ADR-0007 (transport) and ADR-0008 (state ownership): it is the authoritative record of the delta-sync protocol.
