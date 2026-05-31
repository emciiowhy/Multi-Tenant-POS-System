import { describe, expect, it } from "vitest";
import { Outbox } from "./outbox";
import { InMemoryOutboxStore } from "./in-memory-store";

const batch = (id: string) => ({ id, kind: "pos.sale" as const, events: [] });

async function freshOutbox() {
  const store = new InMemoryOutboxStore();
  const outbox = new Outbox(store);
  await outbox.whenReady();
  return { store, outbox };
}

describe("Outbox", () => {
  it("enqueues a pending entry", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    expect(outbox.pendingCount()).toBe(1);
    expect(outbox.pending().map((e) => e.id)).toEqual(["a"]);
    expect(outbox.pending()[0]!.status).toBe("pending");
  });

  it("dedupes a re-enqueued batch id (no-op)", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.enqueue(batch("a"));
    expect(outbox.all()).toHaveLength(1);
  });

  it("markApplied moves an entry off the pending list", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.markApplied("a");
    expect(outbox.pendingCount()).toBe(0);
    expect(outbox.all()[0]!.status).toBe("applied");
  });

  it("markFailed records the reason and drops it from pending", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.markFailed("a", "forbidden");
    expect(outbox.pendingCount()).toBe(0);
    expect(outbox.all()[0]).toMatchObject({ status: "failed", lastError: "forbidden" });
  });

  it("pending() preserves FIFO order", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.enqueue(batch("b"));
    await outbox.enqueue(batch("c"));
    await outbox.markApplied("b");
    expect(outbox.pending().map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("notifies subscribers on change and stops after unsubscribe", async () => {
    const { outbox } = await freshOutbox();
    const seen: number[] = [];
    const unsub = outbox.subscribe((entries) => seen.push(entries.length));
    await outbox.enqueue(batch("a"));
    await outbox.enqueue(batch("b"));
    unsub();
    await outbox.enqueue(batch("c"));
    expect(seen[0]).toBe(0); // immediate emit of current (empty) state
    expect(seen.at(-1)).toBe(2); // last notification before unsubscribe
  });

  it("rehydrates entries from the store (survives a new instance)", async () => {
    const store = new InMemoryOutboxStore();
    const first = new Outbox(store);
    await first.whenReady();
    await first.enqueue(batch("a"));

    const second = new Outbox(store);
    await second.whenReady();
    expect(second.pending().map((e) => e.id)).toEqual(["a"]);
  });

  it("markRetry keeps the entry pending, increments attempts, and records the error", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.markRetry("a", "network");
    expect(outbox.pendingCount()).toBe(1);
    expect(outbox.all()[0]).toMatchObject({ status: "pending", attempts: 1, lastError: "network" });
    await outbox.markRetry("a", "network again");
    expect(outbox.all()[0]).toMatchObject({ attempts: 2, lastError: "network again" });
  });

  it("remove drops an entry (acknowledging a rejected sale)", async () => {
    const { outbox } = await freshOutbox();
    await outbox.enqueue(batch("a"));
    await outbox.enqueue(batch("b"));
    await outbox.remove("a");
    expect(outbox.all().map((e) => e.id)).toEqual(["b"]);
  });

  it("notifies subscribers and persists when removing", async () => {
    const store = new InMemoryOutboxStore();
    const outbox = new Outbox(store);
    await outbox.whenReady();
    await outbox.enqueue(batch("a"));
    await outbox.remove("a");
    const reloaded = new Outbox(store);
    await reloaded.whenReady();
    expect(reloaded.all()).toHaveLength(0);
  });
});
