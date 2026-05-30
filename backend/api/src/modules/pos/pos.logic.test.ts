import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "./pos.logic.js";

describe("computeOrderTotals", () => {
  it("computes line totals, tax, and grand total with fixed-point math", () => {
    const totals = computeOrderTotals([
      { unitPrice: "10.00", quantity: "2", taxRate: "0.1" },
      { unitPrice: "4.50", quantity: "1", taxRate: "0.1" },
    ]);
    expect(totals.lines[0]!.lineTotal).toBe("20.0000");
    expect(totals.lines[1]!.lineTotal).toBe("4.5000");
    expect(totals.subtotal).toBe("24.5000");
    expect(totals.taxTotal).toBe("2.4500");
    expect(totals.grandTotal).toBe("26.9500");
  });

  it("handles a tax-free line", () => {
    const totals = computeOrderTotals([
      { unitPrice: "3.33", quantity: "3", taxRate: "0" },
    ]);
    expect(totals.subtotal).toBe("9.9900");
    expect(totals.taxTotal).toBe("0.0000");
    expect(totals.grandTotal).toBe("9.9900");
  });
});
