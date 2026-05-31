import { describe, expect, it } from "vitest";
import { buildRefundBatch } from "./build-refund-batch";

function counter(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

describe("buildRefundBatch", () => {
  it("builds a single order.refund event against the order", () => {
    const b = buildRefundBatch({ orderClientUuid: "order-1", amount: "12.50", uuid: counter() });
    expect(b.kind).toBe("pos.refund");
    expect(b.orderClientUuid).toBe("order-1");
    expect(b.events).toHaveLength(1);
    expect(b.events[0]).toMatchObject({
      type: "order.refund",
      orderClientUuid: "order-1",
      amount: "12.50",
    });
  });

  it("gives the batch and the event distinct client_uuids", () => {
    const b = buildRefundBatch({ orderClientUuid: "order-1", amount: "5.00", uuid: counter() });
    expect(b.id).not.toBe(b.events[0]!.clientUuid);
  });
});
