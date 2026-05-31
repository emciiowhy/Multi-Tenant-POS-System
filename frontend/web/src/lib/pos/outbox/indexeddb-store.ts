import { createStore, get, set, type UseStore } from "idb-keyval";
import type { OutboxEntry, OutboxStore } from "./types";

const ENTRIES_KEY = "entries";

/**
 * IndexedDB-backed {@link OutboxStore} (the browser binding). The whole entry
 * list is stored under a single key, which keeps the adapter trivial and
 * preserves FIFO order across reloads/crashes. The QueryClient cache (issue 03)
 * reuses the same IndexedDB foundation.
 */
export class IndexedDbOutboxStore implements OutboxStore {
  private readonly store: UseStore;

  constructor(dbName = "vendme-pos-outbox", storeName = "outbox") {
    this.store = createStore(dbName, storeName);
  }

  async load(): Promise<OutboxEntry[]> {
    return (await get<OutboxEntry[]>(ENTRIES_KEY, this.store)) ?? [];
  }

  async save(entries: OutboxEntry[]): Promise<void> {
    await set(ENTRIES_KEY, entries, this.store);
  }
}
