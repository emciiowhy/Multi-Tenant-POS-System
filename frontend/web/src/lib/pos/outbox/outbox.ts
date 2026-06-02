import type { NewBatch, OutboxEntry, OutboxStore } from "./types";

type Listener = (entries: OutboxEntry[]) => void;

/**
 * Durable FIFO queue of pending POS sale batches (PRD: Phase 8b). Keeps an
 * in-memory snapshot for synchronous reads (UI badge) and writes through to an
 * injected {@link OutboxStore}. Replay/network lives elsewhere (the Replay
 * engine, issue 02) — this module owns only queue state + persistence.
 */
export class Outbox {
  private entries: OutboxEntry[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly ready: Promise<void>;

  constructor(
    private readonly store: OutboxStore,
    private readonly now: () => number = Date.now
  ) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    this.entries = await this.store.load();
    this.emit();
  }

  /** Resolves once the initial load from the store has completed. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Append a batch. Re-enqueuing a known id is a no-op (dedupe). */
  async enqueue(batch: NewBatch): Promise<OutboxEntry> {
    await this.ready;
    const existing = this.entries.find((e) => e.id === batch.id);
    if (existing) return existing;
    const entry: OutboxEntry = {
      ...batch,
      status: "pending",
      attempts: 0,
      enqueuedAt: this.now(),
    };
    this.entries = [...this.entries, entry];
    await this.persist();
    return entry;
  }

  /** Pending entries in FIFO (insertion) order. */
  pending(): OutboxEntry[] {
    return this.entries.filter((e) => e.status === "pending");
  }

  pendingCount(): number {
    return this.pending().length;
  }

  all(): OutboxEntry[] {
    return this.snapshot();
  }

  async markApplied(id: string): Promise<void> {
    await this.update(id, (e) => ({ ...e, status: "applied" }));
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.update(id, (e) => ({ ...e, status: "failed", lastError: reason }));
  }

  /** Keep an entry pending after a transient failure: bump attempts (drives the
   * replay backoff) and record the error. */
  async markRetry(id: string, reason: string): Promise<void> {
    await this.update(id, (e) => ({ ...e, attempts: e.attempts + 1, lastError: reason }));
  }

  /** Drop an entry entirely — e.g. the cashier acknowledging a rejected sale. */
  async remove(id: string): Promise<void> {
    await this.ready;
    const next = this.entries.filter((e) => e.id !== id);
    if (next.length !== this.entries.length) {
      this.entries = next;
      await this.persist();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot()); // emit current state immediately
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async update(id: string, fn: (e: OutboxEntry) => OutboxEntry): Promise<void> {
    await this.ready;
    let changed = false;
    this.entries = this.entries.map((e) => {
      if (e.id !== id) return e;
      changed = true;
      return fn(e);
    });
    if (changed) await this.persist();
  }

  private async persist(): Promise<void> {
    await this.store.save(this.entries);
    this.emit();
  }

  private snapshot(): OutboxEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }
}
