import { describe, expect, it } from "vitest";
import { computeExpectedDrawer, drawerVariance } from "./shift.logic.js";

describe("drawer reconciliation", () => {
  it("expected = opening float + signed cash movements", () => {
    expect(computeExpectedDrawer("100.00", ["20", "-5", "10"])).toBe("125.0000");
  });

  it("variance is counted − expected (over is positive)", () => {
    expect(drawerVariance("130.00", "125.0000")).toBe("5.0000");
  });

  it("variance is negative when the drawer is short", () => {
    expect(drawerVariance("120.00", "125.0000")).toBe("-5.0000");
  });
});
