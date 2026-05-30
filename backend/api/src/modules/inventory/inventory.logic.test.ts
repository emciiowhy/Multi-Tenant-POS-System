import { describe, expect, it } from "vitest";
import { computeOnHand, expandRecipe } from "./inventory.logic.js";
import { sumScaled, mulScaled } from "../../lib/decimal.js";

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("fixed-point decimal", () => {
  it("sums without floating-point drift (0.1 + 0.2 === 0.3)", () => {
    expect(sumScaled(["0.1", "0.2"])).toBe("0.3000");
  });

  it("multiplies with half-up rounding to 4dp", () => {
    expect(mulScaled("2.5", "3")).toBe("7.5000");
    expect(mulScaled("0.3333", "3")).toBe("0.9999");
  });
});

describe("computeOnHand projection", () => {
  it("sums movement deltas per stock item", () => {
    const onHand = computeOnHand([
      { stockItemId: A, qtyDelta: "100" },
      { stockItemId: A, qtyDelta: "-3.5" },
      { stockItemId: B, qtyDelta: "10" },
      { stockItemId: A, qtyDelta: "-1.5" },
    ]);
    expect(onHand.get(A)).toBe("95.0000");
    expect(onHand.get(B)).toBe("10.0000");
  });

  it("permits negative on-hand (offline oversell, ADR-0009)", () => {
    const onHand = computeOnHand([
      { stockItemId: A, qtyDelta: "2" },
      { stockItemId: A, qtyDelta: "-5" },
    ]);
    expect(onHand.get(A)).toBe("-3.0000");
  });

  it("is rebuildable: order of events does not change the result", () => {
    const rows = [
      { stockItemId: A, qtyDelta: "7" },
      { stockItemId: A, qtyDelta: "-2.25" },
      { stockItemId: A, qtyDelta: "0.25" },
    ];
    const forward = computeOnHand(rows).get(A);
    const reversed = computeOnHand([...rows].reverse()).get(A);
    expect(forward).toBe(reversed);
    expect(forward).toBe("5.0000");
  });
});

describe("expandRecipe", () => {
  it("expands a fired menu item into negative ingredient movements", () => {
    // A burger: 1 patty (item A) + 2 buns (item B) per unit, 3 burgers fired.
    const movements = expandRecipe(
      [
        { stockItemId: A, quantity: "1" },
        { stockItemId: B, quantity: "2" },
      ],
      "3",
    );
    expect(movements).toEqual([
      { stockItemId: A, qtyDelta: "-3.0000" },
      { stockItemId: B, qtyDelta: "-6.0000" },
    ]);
  });

  it("composes with computeOnHand to deduct stock", () => {
    const starting = [{ stockItemId: A, qtyDelta: "10" }];
    const fired = expandRecipe([{ stockItemId: A, quantity: "1.5" }], "2");
    const onHand = computeOnHand([...starting, ...fired]);
    expect(onHand.get(A)).toBe("7.0000");
  });
});
