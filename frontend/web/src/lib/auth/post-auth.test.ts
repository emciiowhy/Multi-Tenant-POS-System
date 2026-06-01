import { describe, expect, it } from "vitest";
import { needsOnboarding } from "./post-auth";

describe("needsOnboarding", () => {
  it("is true for an account with no memberships (must create a tenant first)", () => {
    expect(needsOnboarding([])).toBe(true);
    expect(needsOnboarding(null)).toBe(true);
    expect(needsOnboarding(undefined)).toBe(true);
  });
  it("is false once the account belongs to at least one company", () => {
    expect(needsOnboarding([{ companyId: "c1" }])).toBe(false);
    expect(needsOnboarding([{ companyId: "c1" }, { companyId: "c2" }])).toBe(false);
  });
});
