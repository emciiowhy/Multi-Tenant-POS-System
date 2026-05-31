import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbOutboxStore } from "./indexeddb-store";
import { Outbox } from "./outbox";
import type { OutboxEntry } from "./types";

// Each test uses a distinct DB name, so the in-process fake IndexedDB stays
// isolated without resetting globals.
const entry = (id: string): OutboxEntry => ({
  id,
  kind: "pos.sale",
  events: [],
  status: "pending",
  attempts: 0,
  enqueuedAt: 1,
});

describe("IndexedDbOutboxStore", () => {
  it("round-trips entries in order", async () => {
    const store = new IndexedDbOutboxStore("db-roundtrip");
    await store.save([entry("a"), entry("b")]);
    expect((await store.load()).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("returns an empty list when nothing was saved", async () => {
    const store = new IndexedDbOutboxStore("db-empty");
    expect(await store.load()).toEqual([]);
  });

  it("survives a reload — a new adapter instance reads prior entries", async () => {
    const first = new IndexedDbOutboxStore("db-reload");
    await first.save([entry("a")]);
    const second = new IndexedDbOutboxStore("db-reload");
    expect((await second.load()).map((e) => e.id)).toEqual(["a"]);
  });

  it("an Outbox backed by IndexedDB rehydrates a queued sale after a new instance", async () => {
    const outbox1 = new Outbox(new IndexedDbOutboxStore("db-outbox"));
    await outbox1.whenReady();
    await outbox1.enqueue({ id: "sale-1", kind: "pos.sale", events: [] });

    const outbox2 = new Outbox(new IndexedDbOutboxStore("db-outbox"));
    await outbox2.whenReady();
    expect(outbox2.pending().map((e) => e.id)).toEqual(["sale-1"]);
  });
});
