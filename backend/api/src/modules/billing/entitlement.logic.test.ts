import { describe, expect, it } from "vitest";
import {
  decideAccess,
  PAST_DUE_GRACE_DAYS,
  type SubscriptionLike,
} from "./entitlement.logic";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (d: number): Date => new Date(NOW.getTime() + d * DAY_MS);
const sub = (
  status: SubscriptionLike["status"],
  currentPeriodEnd: Date | null = null,
): SubscriptionLike => ({ status, currentPeriodEnd });

describe("decideAccess", () => {
  it("allows an active subscription", () => {
    expect(decideAccess(sub("active"), NOW)).toEqual({ allowed: true, reason: "active" });
  });

  it("allows a trial that hasn't ended", () => {
    expect(decideAccess(sub("trialing", daysFromNow(5)), NOW)).toEqual({
      allowed: true,
      reason: "trialing",
    });
  });

  it("blocks a trial once it has ended", () => {
    expect(decideAccess(sub("trialing", daysFromNow(-1)), NOW)).toEqual({
      allowed: false,
      reason: "trial_expired",
    });
  });

  it("treats the trial-end boundary as expired (now == periodEnd)", () => {
    expect(decideAccess(sub("trialing", NOW), NOW)).toEqual({
      allowed: false,
      reason: "trial_expired",
    });
  });

  it("blocks a trialing subscription with no period end", () => {
    expect(decideAccess(sub("trialing", null), NOW)).toEqual({
      allowed: false,
      reason: "trial_expired",
    });
  });

  it("allows past_due within the grace window", () => {
    expect(decideAccess(sub("past_due", daysFromNow(-1)), NOW)).toEqual({
      allowed: true,
      reason: "grace",
    });
  });

  it("blocks past_due once the grace window has passed", () => {
    expect(
      decideAccess(sub("past_due", daysFromNow(-(PAST_DUE_GRACE_DAYS + 1))), NOW),
    ).toEqual({ allowed: false, reason: "past_due" });
  });

  it("blocks canceled, unpaid, and incomplete", () => {
    expect(decideAccess(sub("canceled"), NOW)).toMatchObject({ allowed: false, reason: "canceled" });
    expect(decideAccess(sub("unpaid"), NOW)).toMatchObject({ allowed: false, reason: "unpaid" });
    expect(decideAccess(sub("incomplete"), NOW)).toMatchObject({
      allowed: false,
      reason: "incomplete",
    });
  });

  it("blocks when there is no subscription at all", () => {
    expect(decideAccess(null, NOW)).toEqual({ allowed: false, reason: "no_subscription" });
  });
});
