import { describe, expect, it } from "vitest";
import { badgeVariant } from "./badge-variant";

/**
 * The Badge maps many system statuses (subscription, outbox/transaction, shift,
 * KDS ticket, table) onto a small set of token-backed variants. The mapping must
 * be total and safe — an unknown status must never throw and must degrade to
 * neutral (slate), never to an alarming colour.
 */
describe("badgeVariant", () => {
  it("maps healthy / entitled / completed states to success (emerald)", () => {
    for (const s of ["active", "trialing", "applied", "ready", "open", "paid"]) {
      expect(badgeVariant(s)).toBe("success");
    }
  });

  it("maps in-progress / needs-attention states to warning (amber)", () => {
    for (const s of ["past_due", "pending", "preparing"]) {
      expect(badgeVariant(s)).toBe("warning");
    }
  });

  it("maps failed / blocked / lapsed states to danger (red)", () => {
    for (const s of ["canceled", "unpaid", "incomplete", "failed", "rejected"]) {
      expect(badgeVariant(s)).toBe("danger");
    }
  });

  it("maps terminal / idle states to neutral (slate)", () => {
    for (const s of ["closed", "served", "free", "draft"]) {
      expect(badgeVariant(s)).toBe("neutral");
    }
  });

  it("is case-insensitive", () => {
    expect(badgeVariant("ACTIVE")).toBe("success");
    expect(badgeVariant("Past_Due")).toBe("warning");
    expect(badgeVariant("Canceled")).toBe("danger");
  });

  it("defaults unknown / empty statuses to neutral and never throws", () => {
    expect(badgeVariant("definitely-not-a-status")).toBe("neutral");
    expect(badgeVariant("")).toBe("neutral");
    expect(badgeVariant(undefined as unknown as string)).toBe("neutral");
  });
});
