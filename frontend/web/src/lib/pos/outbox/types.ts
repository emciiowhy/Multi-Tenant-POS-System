import type { PosEvent } from "@vendme/contracts";

export type OutboxStatus = "pending" | "applied" | "failed";

/** What kind of POS work a batch represents (a sale or a refund). */
export type BatchKind = "pos.sale" | "pos.refund";

/** A queued, durable unit of work — one POS sale's or refund's event batch. */
export interface OutboxEntry {
  /** Batch id; the dedupe/idempotency key for the whole batch. */
  id: string;
  kind: BatchKind;
  /** The events (e.g. open→fire→settle, or a single refund), each with a client_uuid. */
  events: PosEvent[];
  status: OutboxStatus;
  attempts: number;
  enqueuedAt: number;
  lastError?: string;
}

/** What the caller hands `enqueue` (status/attempts are assigned by the Outbox). */
export interface NewBatch {
  id: string;
  kind: BatchKind;
  events: PosEvent[];
}

/**
 * Persistence port for the Outbox. The browser binds IndexedDB; tests bind an
 * in-memory store. Whole-list load/save keeps the contract trivial (the queue
 * is small) and preserves insertion (FIFO) order.
 */
export interface OutboxStore {
  load(): Promise<OutboxEntry[]>;
  save(entries: OutboxEntry[]): Promise<void>;
}
