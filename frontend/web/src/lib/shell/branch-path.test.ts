import { describe, expect, it } from "vitest";
import { branchIdFromPath } from "./branch-path";

describe("branchIdFromPath", () => {
  it("extracts the branch id from every branch-scoped route", () => {
    expect(branchIdFromPath("/pos/b1")).toBe("b1");
    expect(branchIdFromPath("/shifts/b2")).toBe("b2");
    expect(branchIdFromPath("/returns/b3")).toBe("b3");
    expect(branchIdFromPath("/restaurant/floor/b4")).toBe("b4");
    expect(branchIdFromPath("/restaurant/kds/b5")).toBe("b5");
    expect(branchIdFromPath("/catalog/b6")).toBe("b6");
    expect(branchIdFromPath("/inventory/b7")).toBe("b7");
  });

  it("ignores deeper segments", () => {
    expect(branchIdFromPath("/pos/b1/receipt")).toBe("b1");
  });

  it("returns null for non-branch or incomplete routes", () => {
    expect(branchIdFromPath("/billing")).toBeNull();
    expect(branchIdFromPath("/")).toBeNull();
    expect(branchIdFromPath("/pos")).toBeNull();
    expect(branchIdFromPath("/pos/")).toBeNull();
  });
});
