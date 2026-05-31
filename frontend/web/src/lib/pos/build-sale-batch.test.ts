import { describe, expect, it } from "vitest";
import { buildSaleBatch } from "./build-sale-batch";
import type { CartItem } from "./cart-logic";

const items: CartItem[] = [
  { productId: "p1", name: "Burger", unitPrice: "9.50", quantity: 2 },
  { productId: "p2", name: "Fries", unitPrice: "4.00", quantity: 1 },
];

/** Deterministic id generator so we can assert sharing/distinctness. */
function counter(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

describe("buildSaleBatch", () => {
  it("produces an open → fire → settle batch", () => {
    const b = buildSaleBatch({
      branchId: "b1",
      items,
      tender: { method: "cash", amount: "23.00" },
      uuid: counter(),
    });
    expect(b.kind).toBe("pos.sale");
    expect(b.events.map((e) => e.type)).toEqual([
      "order.open",
      "order.fire",
      "order.settle",
    ]);
  });

  it("shares one orderClientUuid across all events; each event gets a distinct client_uuid", () => {
    const b = buildSaleBatch({
      branchId: "b1",
      items,
      tender: { method: "cash", amount: "23.00" },
      uuid: counter(),
    });
    expect(new Set(b.events.map((e) => e.orderClientUuid))).toEqual(
      new Set([b.orderClientUuid]),
    );
    expect(new Set(b.events.map((e) => e.clientUuid)).size).toBe(3);
    expect(b.id).not.toBe(b.orderClientUuid);
  });

  it("maps cart items to fire lines (productId + quantity as string)", () => {
    const b = buildSaleBatch({
      branchId: "b1",
      items,
      tender: { method: "cash", amount: "23.00" },
      uuid: counter(),
    });
    const fire = b.events.find((e) => e.type === "order.fire");
    expect(fire).toMatchObject({
      lines: [
        { productId: "p1", quantity: "2" },
        { productId: "p2", quantity: "1" },
      ],
    });
  });

  it("carries the branch into open and the tender into settle", () => {
    const b = buildSaleBatch({
      branchId: "b1",
      items,
      tender: { method: "card", amount: "23.00" },
      uuid: counter(),
    });
    expect(b.events.find((e) => e.type === "order.open")).toMatchObject({ branchId: "b1" });
    expect(b.events.find((e) => e.type === "order.settle")).toMatchObject({
      tenders: [{ method: "card", amount: "23.00" }],
    });
  });
});
