// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

// Drive the dynamic CTA by mocking the session bridge (slice 06).
let status: "loading" | "authenticated" | "unauthenticated" = "unauthenticated";
vi.mock("@/components/auth/SessionProvider", () => ({
  useAppSession: () => ({
    status,
    account: null,
    activeCompany: null,
    companies: [],
    enabledModules: {},
    switchCompany: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import LandingPage from "./page";

beforeEach(() => {
  status = "unauthenticated";
});

afterEach(() => cleanup());

describe("Landing page", () => {
  it("renders the marketing surface — hero, feature grid, pricing — and stays shell-free", () => {
    render(<LandingPage />);

    expect(screen.getByTestId("landing-hero")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /offline|point of sale|pos/i
    );

    // Feature grid showcases the core capabilities (POS, Shifts) + upcoming Restaurant.
    const features = within(screen.getByTestId("feature-grid"));
    expect(features.getByRole("heading", { name: /point of sale/i })).toBeTruthy();
    expect(features.getByRole("heading", { name: /shift management/i })).toBeTruthy();
    expect(features.getByRole("heading", { name: /restaurant/i })).toBeTruthy();

    // Pricing matrix shows all three tiers.
    const pricing = within(screen.getByTestId("pricing"));
    expect(pricing.getByRole("heading", { name: /free trial/i })).toBeTruthy();
    expect(pricing.getByRole("heading", { name: /standard/i })).toBeTruthy();
    expect(pricing.getByRole("heading", { name: /enterprise/i })).toBeTruthy();

    // Outside the (dashboard) shell group → no sidebar/shell chrome.
    expect(screen.queryByTestId("app-sidebar")).toBeNull();
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("shows a Get Started CTA into /login for an unauthenticated visitor", () => {
    status = "unauthenticated";
    render(<LandingPage />);
    const cta = screen.getByTestId("hero-cta");
    expect(cta.textContent).toMatch(/get started|sign in/i);
    expect(cta.getAttribute("href")).toBe("/login");
  });

  it("shifts the CTA to Go to dashboard for an authenticated session, targeting a real route", () => {
    status = "authenticated";
    render(<LandingPage />);
    const cta = screen.getByTestId("hero-cta");
    expect(cta.textContent).toMatch(/go to dashboard/i);
    const href = cta.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).not.toBe("/");
    expect(href!.startsWith("/")).toBe(true);
  });

  it("leans on the slice-01 design tokens and ships no hardcoded hex colors", () => {
    const { container } = render(<LandingPage />);
    const html = container.innerHTML;
    // Token utilities in use (brand accent + surface/foreground), not raw palette.
    expect(html).toMatch(/\bbg-brand\b/);
    expect(html).toMatch(/\btext-fg\b/);
    expect(html).toMatch(/\bbg-surface\b/);
    // No literal hex colors anywhere in the rendered markup.
    expect(html).not.toMatch(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  });
});
