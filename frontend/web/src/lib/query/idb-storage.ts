import { createStore, del, get, set, type UseStore } from "idb-keyval";

/** The async key/value shape `createAsyncStoragePersister` expects. */
export interface AsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * IndexedDB-backed AsyncStorage for the TanStack Query persister — the same
 * idb-keyval foundation the outbox uses (issue 01), in its own object store.
 * The store is opened lazily on first use so importing/constructing this is
 * SSR-safe (IndexedDB is only touched in the browser, during persist/restore).
 */
export function createIdbStorage(
  dbName = "vendme-pos-cache",
  storeName = "query-cache",
): AsyncStorage {
  let store: UseStore | null = null;
  const useStore = (): UseStore => (store ??= createStore(dbName, storeName));

  return {
    async getItem(key) {
      return (await get<string>(key, useStore())) ?? null;
    },
    async setItem(key, value) {
      await set(key, value, useStore());
    },
    async removeItem(key) {
      await del(key, useStore());
    },
  };
}
