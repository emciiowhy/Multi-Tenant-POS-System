# Self-hosted Socket.IO with a Redis adapter for realtime

Realtime runs on the Express API process (ADR-0003) using Socket.IO with `@socket.io/redis-adapter` for cross-instance fan-out. Clients authenticate by presenting the same access JWT on connect (verified via JWKS, ADR-0004) and are joined to tenant-scoped rooms: `company:{id}:branch:{id}` and `kds:{branch}`. Events include `order.fired`, `stock.changed`, `shift.opened/closed`.

## Why

- POS/KDS generate high message volume; a managed provider (Ably/Pusher) prices per message and would be costly at scale, plus it adds a second auth bridge and vendor lock-in.
- We already operate a stateful Express server and a Redis instance (revocation set, rate limiting, queues), so co-locating realtime there adds no new managed dependency.
- Liveblocks (CRDT/collab-doc oriented) and Supabase Realtime (coupled to Supabase Postgres, but we run Neon) both mismatch a POS event bus.

## Consequences

- The API deploy target must support persistent WebSocket connections (Railway/Fly, not Vercel functions) and sticky sessions or a Redis-backed adapter — we use the adapter.
- We own scaling and Redis HA for realtime; that is an accepted operational cost.
