import type { OutboxEntry, OutboxStore } from "./types";

/** In-memory {@link OutboxStore} for tests/dev. Copies on read/write so callers
 * can't mutate the backing array. */
export class InMemoryOutboxStore implements OutboxStore {
  private data: OutboxEntry[] = [];

  async load(): Promise<OutboxEntry[]> {
    return this.data.map((e) => ({ ...e }));
  }

  async save(entries: OutboxEntry[]): Promise<void> {
    this.data = entries.map((e) => ({ ...e }));
  }
}
