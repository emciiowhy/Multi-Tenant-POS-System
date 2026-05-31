import { describe, expect, it } from "vitest";
import { isActiveNav } from "./nav-active";

describe("isActiveNav", () => {
  it("matches the exact path", () => {
    expect(isActiveNav("/pos/b1", "/pos/b1")).toBe(true);
    expect(isActiveNav("/billing", "/billing")).toBe(true);
  });

  it("matches nested child routes", () => {
    expect(isActiveNav("/pos/b1/receipt", "/pos/b1")).toBe(true);
    expect(isActiveNav("/billing/invoices", "/billing")).toBe(true);
  });

  it("does not false-match sibling prefixes", () => {
    expect(isActiveNav("/pos/b12", "/pos/b1")).toBe(false);
    expect(isActiveNav("/posX", "/pos")).toBe(false);
  });

  it("does not match a different section", () => {
    expect(isActiveNav("/shifts/b1", "/pos/b1")).toBe(false);
  });

  it("treats the root href as exact-only", () => {
    expect(isActiveNav("/", "/")).toBe(true);
    expect(isActiveNav("/pos/b1", "/")).toBe(false);
  });
});
