import { describe, expect, it } from "vitest";
import { cartCount, cartSubtotal, moneyEquals, type CartItem } from "./cart-logic";

const item = (unitPrice: string, quantity: number): CartItem => ({
  productId: crypto.randomUUID(),
  name: "x",
  unitPrice,
  quantity,
});

describe("cartSubtotal", () => {
  it("sums price × quantity with fixed-point precision", () => {
    expect(cartSubtotal([item("9.50", 2), item("4.00", 1)])).toBe("23.0000");
  });

  it("handles fractional prices without float drift", () => {
    expect(cartSubtotal([item("0.10", 3)])).toBe("0.3000");
  });

  it("is 0 for an empty cart", () => {
    expect(cartSubtotal([])).toBe("0.0000");
  });
});

describe("cartCount", () => {
  it("totals the unit quantities", () => {
    expect(cartCount([item("1.00", 2), item("1.00", 3)])).toBe(5);
    expect(cartCount([])).toBe(0);
  });
});

describe("moneyEquals", () => {
  it("ignores trailing-zero formatting differences", () => {
    expect(moneyEquals("23.00", "23.0000")).toBe(true);
    expect(moneyEquals("0", "0.0000")).toBe(true);
  });

  it("is false for genuinely different amounts", () => {
    expect(moneyEquals("23.00", "20.00")).toBe(false);
    expect(moneyEquals("23.00", "23.01")).toBe(false);
  });
});
