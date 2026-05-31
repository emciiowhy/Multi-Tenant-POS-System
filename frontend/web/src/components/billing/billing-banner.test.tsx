// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BillingBanner } from "./billing-banner";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (d: number) => new Date(NOW.getTime() + d * DAY_MS).toISOString();

afterEach(cleanup);

describe("BillingBanner", () => {
  it("renders nothing for an active subscription", () => {
    const { container } = render(
      <BillingBanner sub={{ status: "active", currentPeriodEnd: inDays(30) }} now={NOW} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is no subscription", () => {
    const { container } = render(<BillingBanner sub={null} now={NOW} />);
    expect(container.firstChild).toBeNull();
  });

  it("warns with the days left when a trial is ending", () => {
    render(<BillingBanner sub={{ status: "trialing", currentPeriodEnd: inDays(2) }} now={NOW} />);
    expect(screen.getByText(/ends in 2 days/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /subscribe/i }).getAttribute("href")).toBe("/billing");
  });

  it("renders the past-due state", () => {
    render(<BillingBanner sub={{ status: "past_due", currentPeriodEnd: inDays(-1) }} now={NOW} />);
    expect(screen.getByText(/payment failed/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /fix payment/i })).toBeTruthy();
  });

  it("renders the expired-trial state", () => {
    render(<BillingBanner sub={{ status: "trialing", currentPeriodEnd: inDays(-1) }} now={NOW} />);
    expect(screen.getByText(/trial has ended/i)).toBeTruthy();
  });
});
