import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PosEventResult } from "@vendme/contracts";
import { Outbox } from "../outbox/outbox";
import { InMemoryOutboxStore } from "../outbox/in-memory-store";
import { ReplayEngine } from "./replay-engine";

const applied = (): PosEventResult[] => [{ clientUuid: "x", status: "applied" }];
const duplicate = (): PosEventResult[] => [{ clientUuid: "x", status: "duplicate" }];
const rejected = (reason: string): PosEventResult[] => [
  { clientUuid: "x", status: "rejected", reason },
];

function fakeOnline(initial = true) {
  let on = initial;
  const listeners = new Set<() => void>();
  return {
    isOnline: () => on,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    set(next: boolean) {
      on = next;
      for (const l of listeners) l();
    },
  };
}

async function outboxWith(ids: string[]) {
  const outbox = new Outbox(new InMemoryOutboxStore());
  await outbox.whenReady();
  for (const id of ids) await outbox.enqueue({ id, kind: "pos.sale", events: [] });
  return outbox;
}

describe("ReplayEngine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("drains pending FIFO and marks each applied", async () => {
    const outbox = await outboxWith(["a", "b", "c"]);
    const order: string[] = [];
    vi.spyOn(outbox, "markApplied").mockImplementation(async (id) => {
      order.push(id);
    });
    const submit = vi.fn(async () => applied());
    const engine = new ReplayEngine({ outbox, submit, online: fakeOnline(true) });

    await engine.flush();

    expect(submit).toHaveBeenCalledTimes(3);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("treats duplicate as success (no double-apply)", async () => {
    const outbox = await outboxWith(["a"]);
    const engine = new ReplayEngine({
      outbox,
      submit: async () => duplicate(),
      online: fakeOnline(true),
    });
    await engine.flush();
    expect(outbox.all()[0]!.status).toBe("applied");
  });

  it("fails a rejected batch and continues to the next", async () => {
    const outbox = await outboxWith(["a", "b"]);
    const submit = vi
      .fn<() => Promise<PosEventResult[]>>()
      .mockResolvedValueOnce(rejected("forbidden"))
      .mockResolvedValueOnce(applied());
    const engine = new ReplayEngine({ outbox, submit, online: fakeOnline(true) });

    await engine.flush();

    expect(submit).toHaveBeenCalledTimes(2);
    expect(outbox.all().find((e) => e.id === "a")).toMatchObject({
      status: "failed",
      lastError: "forbidden",
    });
    expect(outbox.all().find((e) => e.id === "b")!.status).toBe("applied");
  });

  it("retains a transport failure, increments attempts, and retries with backoff", async () => {
    const outbox = await outboxWith(["a"]);
    const submit = vi
      .fn<() => Promise<PosEventResult[]>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(applied());
    const engine = new ReplayEngine({
      outbox,
      submit,
      online: fakeOnline(true),
      baseMs: 1000,
      capMs: 60000,
    });

    await engine.flush();
    expect(outbox.pendingCount()).toBe(1);
    expect(outbox.all()[0]).toMatchObject({ status: "pending", attempts: 1 });

    await vi.advanceTimersByTimeAsync(1000); // backoff fires the retry
    expect(submit).toHaveBeenCalledTimes(2);
    expect(outbox.pendingCount()).toBe(0);
    expect(outbox.all()[0]!.status).toBe("applied");
  });

  it("does nothing while offline", async () => {
    const outbox = await outboxWith(["a"]);
    const submit = vi.fn(async () => applied());
    const engine = new ReplayEngine({ outbox, submit, online: fakeOnline(false) });
    await engine.flush();
    expect(submit).not.toHaveBeenCalled();
    expect(outbox.pendingCount()).toBe(1);
  });

  it("on a 401 calls onAuthError and stops without failing the entry", async () => {
    const outbox = await outboxWith(["a", "b"]);
    const onAuthError = vi.fn(async () => {});
    const submit = vi.fn(async () => {
      throw { status: 401 };
    });
    const engine = new ReplayEngine({ outbox, submit, online: fakeOnline(true), onAuthError });

    await engine.flush();

    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1); // stopped after the auth error
    expect(outbox.all()[0]!.status).toBe("pending"); // not failed; queue survives
  });

  it("on a 402 calls onBillingRequired and stops — queue stays pending, no retry storm", async () => {
    const outbox = await outboxWith(["a", "b"]);
    const onBillingRequired = vi.fn(async () => {});
    const submit = vi.fn(async () => {
      throw { status: 402 };
    });
    const engine = new ReplayEngine({
      outbox,
      submit,
      online: fakeOnline(true),
      onBillingRequired,
    });

    await engine.flush();

    expect(onBillingRequired).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1); // stopped after the billing block
    // Not failed, not retried — the queue is intact and replays once billing is fixed.
    expect(outbox.all()[0]).toMatchObject({ status: "pending", attempts: 0 });

    await vi.advanceTimersByTimeAsync(60000); // no backoff retry was scheduled
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("handles 402 distinctly from 401 (billing block, not re-login)", async () => {
    const outbox = await outboxWith(["a"]);
    const onAuthError = vi.fn(async () => {});
    const onBillingRequired = vi.fn(async () => {});
    const submit = vi.fn(async () => {
      throw { status: 402 };
    });
    const engine = new ReplayEngine({
      outbox,
      submit,
      online: fakeOnline(true),
      onAuthError,
      onBillingRequired,
    });

    await engine.flush();

    expect(onBillingRequired).toHaveBeenCalledTimes(1);
    expect(onAuthError).not.toHaveBeenCalled();
  });

  it("flushes automatically when connectivity returns", async () => {
    const outbox = await outboxWith(["a"]);
    const submit = vi.fn(async () => applied());
    const online = fakeOnline(false);
    const engine = new ReplayEngine({ outbox, submit, online });
    engine.start();

    expect(submit).not.toHaveBeenCalled(); // offline at start

    online.set(true); // reconnect
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(outbox.pendingCount()).toBe(0);
    engine.stop();
  });
});
