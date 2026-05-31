import { describe, expect, it } from "vitest";
import type { FloorPlan, KitchenTicket } from "@vendme/contracts";
import { applyKdsEvent, applyTableEvent } from "./apply-event";

const ticket = (id: string, status: KitchenTicket["status"]): KitchenTicket => ({
  id,
  orderId: "00000000-0000-0000-0000-000000000001",
  branchId: "00000000-0000-0000-0000-000000000002",
  status,
  firedAt: "2026-05-31T00:00:00.000Z",
  readyAt: null,
});

describe("applyKdsEvent", () => {
  it("updates the matching ticket's status in place", () => {
    const before = [ticket("a", "queued"), ticket("b", "queued")];
    const after = applyKdsEvent(before, {
      type: "kitchen.ticket.updated",
      ticketId: "a",
      status: "preparing",
    });
    expect(after.find((t) => t.id === "a")?.status).toBe("preparing");
    expect(after.find((t) => t.id === "b")?.status).toBe("queued");
  });

  it("drops a ticket off the board once served", () => {
    const before = [ticket("a", "ready"), ticket("b", "queued")];
    const after = applyKdsEvent(before, {
      type: "kitchen.ticket.updated",
      ticketId: "a",
      status: "served",
    });
    expect(after.map((t) => t.id)).toEqual(["b"]);
  });

  it("does not mutate the input array", () => {
    const before = [ticket("a", "queued")];
    applyKdsEvent(before, { type: "kitchen.ticket.updated", ticketId: "a", status: "ready" });
    expect(before[0]!.status).toBe("queued");
  });
});

const table = (id: string, status: FloorPlan["tables"][number]["status"]): FloorPlan["tables"][number] => ({
  id,
  branchId: "00000000-0000-0000-0000-000000000002",
  sectionId: null,
  label: id.toUpperCase(),
  seats: 4,
  status,
  posX: 0,
  posY: 0,
  width: 80,
  height: 80,
  shape: "rect",
});

describe("applyTableEvent", () => {
  it("updates only the matching table's status", () => {
    const plan: FloorPlan = { sections: [], tables: [table("t1", "free"), table("t2", "free")] };
    const after = applyTableEvent(plan, {
      type: "table.changed",
      tableId: "t1",
      status: "seated",
    });
    expect(after.tables.find((t) => t.id === "t1")?.status).toBe("seated");
    expect(after.tables.find((t) => t.id === "t2")?.status).toBe("free");
  });

  it("preserves table layout fields", () => {
    const plan: FloorPlan = { sections: [], tables: [{ ...table("t1", "free"), posX: 120, posY: 40 }] };
    const after = applyTableEvent(plan, { type: "table.changed", tableId: "t1", status: "ordered" });
    expect(after.tables[0]).toMatchObject({ posX: 120, posY: 40, status: "ordered" });
  });
});
