# Offline product catalog (persisted cache)

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/phase-8b-offline-outbox/PRD.md`

## What to build

Persist the Register's server-derived state so it works with no network from a
cold load. Wire `persistQueryClient` over the same IndexedDB foundation
established in slice 1, so the products query is written to and restored from
IndexedDB. With the network offline from a fresh page load, the Register renders
the product grid from cache and the cashier can build a cart (which then flows
into the outbox from slice 1). When online, the cache refetches normally.

Reuse the single IndexedDB layer — do not stand up a second persistence setup.

## Acceptance criteria

- [x] The products query is persisted to IndexedDB and restored on a cold load.
- [x] With the network offline from a fresh load, the Register shows the product grid from cache and a cart can be built.
- [x] Cache persistence reuses the IndexedDB foundation from slice 1 (one IDB setup, not two).
- [x] When online, the catalog refetches and the cache updates; offline, the cached catalog is used without error.

## Blocked by

- `.scratch/phase-8b-offline-outbox/issues/01-outbox-enqueue-and-persist.md`

## Comments

**Done (2026-05-31), red-green.** `lib/query/idb-storage.ts` `createIdbStorage` — an AsyncStorage (getItem/setItem/removeItem) over **idb-keyval** (same foundation as the outbox, separate object store), with a lazily-opened store so it's SSR-safe. `Providers` now uses `PersistQueryClientProvider` + `createAsyncStoragePersister(createIdbStorage())` with a 24h gcTime/maxAge, so the whole query cache (incl. the products query) persists to IndexedDB and restores on a cold load; offline, `networkMode: "online"` serves the cached catalog without refetching. Added `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`. 4 new tests (storage adapter via fake-indexeddb) → 43 frontend tests; typecheck 8/8; full suite 8/8.

Note: the storage adapter is unit-tested; the restore-and-render-offline behavior is wired + typechecks but, like 01/02, isn't yet covered by a component test (jsdom/Testing-Library setup lands with issue 04).
