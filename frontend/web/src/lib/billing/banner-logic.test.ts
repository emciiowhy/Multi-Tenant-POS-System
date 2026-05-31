import { describe, expect, it } from "vitest";
import { bannerState, TRIAL_WARNING_DAYS, type BannerSub } from "./banner-logic";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (d: number): string => new Date(NOW.getTime() + d * DAY_MS).toISOString();
const sub = (status: string, currentPeriodEnd: string | null = null): BannerSub => ({
  status,
  currentPeriodEnd,
});

describe("bannerState", () => {
  it("shows nothing for an active subscription", () => {
    expect(bannerState(sub("active", inDays(20)), NOW)).toEqual({ kind: "none" });
  });

  it("shows nothing for a trial with plenty of time left", () => {
    expect(bannerState(sub("trialing", inDays(10)), NOW)).toEqual({ kind: "none" });
  });

  it("warns when a trial is ending within the warning window", () => {
    expect(bannerState(sub("trialing", inDays(2)), NOW)).toEqual({
      kind: "trial_ending",
      daysLeft: 2,
    });
  });

  it("treats the warning boundary as ending (exactly TRIAL_WARNING_DAYS left)", () => {
    expect(bannerState(sub("trialing", inDays(TRIAL_WARNING_DAYS)), NOW)).toMatchObject({
      kind: "trial_ending",
    });
  });

  it("reports an expired trial (period in the past, or missing)", () => {
    expect(bannerState(sub("trialing", inDays(-1)), NOW)).toEqual({ kind: "trial_expired" });
    expect(bannerState(sub("trialing", null), NOW)).toEqual({ kind: "trial_expired" });
  });

  it("reports a past-due payment", () => {
    expect(bannerState(sub("past_due", inDays(-1)), NOW)).toEqual({ kind: "past_due" });
  });

  it("reports a blocked status for canceled/unpaid/incomplete", () => {
    expect(bannerState(sub("canceled"), NOW)).toEqual({ kind: "blocked", status: "canceled" });
    expect(bannerState(sub("unpaid"), NOW)).toMatchObject({ kind: "blocked" });
  });

  it("shows nothing when there is no subscription (the page handles subscribing)", () => {
    expect(bannerState(null, NOW)).toEqual({ kind: "none" });
  });
});
