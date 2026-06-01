import { describe, expect, it } from "vitest";
import { pricingTiers, STANDARD_PRICE_DISPLAY, TRIAL_DAYS } from "./pricing";

describe("pricingTiers", () => {
  const tiers = pricingTiers();

  it("offers exactly three tiers in order: Free Trial, Standard, Enterprise", () => {
    expect(tiers.map((t) => t.key)).toEqual(["trial", "standard", "enterprise"]);
    expect(tiers.find((t) => t.key === "trial")!.name).toMatch(/free trial/i);
    expect(tiers.find((t) => t.key === "standard")!.name).toMatch(/standard/i);
    expect(tiers.find((t) => t.key === "enterprise")!.name).toMatch(/enterprise/i);
  });

  it("features the Standard plan and prices it from the display constant", () => {
    const standard = tiers.find((t) => t.key === "standard")!;
    expect(standard.featured).toBe(true);
    expect(standard.price).toBe(STANDARD_PRICE_DISPLAY);
  });

  it("states the trial length from the TRIAL_DAYS constant", () => {
    expect(TRIAL_DAYS).toBe(14);
    const trial = tiers.find((t) => t.key === "trial")!;
    const copy = `${trial.price} ${trial.blurb} ${trial.features.join(" ")}`;
    expect(copy).toContain(String(TRIAL_DAYS));
  });

  it("routes the trial + standard CTAs into the auth flow, never Stripe directly", () => {
    for (const key of ["trial", "standard"] as const) {
      expect(tiers.find((t) => t.key === key)!.cta.href).toBe("/login");
    }
  });
});
