import { Outbox } from "./outbox";
import { IndexedDbOutboxStore } from "./indexeddb-store";

export { Outbox } from "./outbox";
export { InMemoryOutboxStore } from "./in-memory-store";
export { IndexedDbOutboxStore } from "./indexeddb-store";
export type { OutboxEntry, OutboxStatus, OutboxStore, NewBatch } from "./types";

let instance: Outbox | null = null;

/**
 * Process-wide browser Outbox singleton (IndexedDB-backed). Call only in the
 * browser — event handlers and `useSyncExternalStore` client snapshots — never
 * during SSR (it opens IndexedDB on construction).
 */
export function getOutbox(): Outbox {
  if (!instance) instance = new Outbox(new IndexedDbOutboxStore());
  return instance;
}
