import { describe, expect, it } from "vitest";
import { DASHBOARD_HOME, landingCta } from "./landing-cta";

describe("landingCta", () => {
  it("prompts an unauthenticated visitor to get started, into /login", () => {
    const cta = landingCta({ status: "unauthenticated" });
    expect(cta.label).toMatch(/get started|sign in/i);
    expect(cta.href).toBe("/login");
  });

  it("treats a still-resolving session as a visitor (no premature dashboard link)", () => {
    const cta = landingCta({ status: "loading" });
    expect(cta.label).toMatch(/get started|sign in/i);
    expect(cta.href).toBe("/login");
  });

  it("sends an authenticated user to the dashboard, at a real in-app route", () => {
    const cta = landingCta({ status: "authenticated" });
    expect(cta.label).toMatch(/go to dashboard/i);
    expect(cta.href).toBe(DASHBOARD_HOME);
    expect(cta.href.startsWith("/")).toBe(true);
    // not back to the marketing root
    expect(cta.href).not.toBe("/");
  });
});
