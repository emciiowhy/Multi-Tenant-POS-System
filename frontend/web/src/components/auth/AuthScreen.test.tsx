// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AppSession } from "./SessionProvider";
import { DASHBOARD_HOME } from "@/lib/marketing/landing-cta";

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: replace }),
  usePathname: () => "/login",
  useSearchParams: () => params,
}));

let session: AppSession;
vi.mock("./SessionProvider", () => ({ useAppSession: () => session }));
// Child forms are exercised in their own suites — stub them to markers here.
vi.mock("./SignInForm", () => ({ SignInForm: () => <div data-testid="signin-form" /> }));
vi.mock("./SignUpForm", () => ({ SignUpForm: () => <div data-testid="signup-form" /> }));
vi.mock("./OnboardingForm", () => ({
  OnboardingForm: () => <div data-testid="onboarding-form" />,
}));

import { AuthScreen } from "./AuthScreen";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";

const signOut = vi.fn();
const base: AppSession = {
  status: "unauthenticated",
  account: null,
  activeCompany: null,
  companies: [],
  enabledModules: {},
  switchCompany: vi.fn(),
  addCompany: vi.fn(),
  signOut,
};
const company = { id: "c1", name: "Acme", slug: "acme", role: "company_owner", isActive: true };
const account = { id: "a", name: "Jane", email: null, imageUrl: null, initials: "J" };
const member: AppSession = {
  ...base,
  status: "authenticated",
  account,
  companies: [company],
  activeCompany: company,
};

beforeEach(() => {
  params = new URLSearchParams();
  session = { ...base };
});
afterEach(() => {
  cleanup();
  replace.mockReset();
  signOut.mockReset();
  useAuthFlowStore.getState().reset();
});

describe("AuthScreen", () => {
  it("shows the sign-in form by default, with a decorative brand panel", () => {
    render(<AuthScreen />);
    expect(screen.getByTestId("signin-form")).toBeTruthy();
    expect(screen.getByTestId("brand-panel").getAttribute("aria-hidden")).toBe("true");
  });

  it("respects ?mode=signup", () => {
    params = new URLSearchParams("mode=signup");
    render(<AuthScreen />);
    expect(screen.getByTestId("signup-form")).toBeTruthy();
  });

  it("toggles to sign up via the segmented control", () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.getByTestId("signup-form")).toBeTruthy();
  });

  it("routes an authenticated account with no tenant into onboarding (no redirect)", () => {
    session = { ...base, status: "authenticated", account, companies: [] };
    render(<AuthScreen />);
    expect(screen.getByTestId("onboarding-form")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("offers Continue / Switch (no auto-redirect) when a member ARRIVES already signed in", () => {
    session = member;
    render(<AuthScreen />);
    expect(screen.getByTestId("signed-in-panel")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard after the member signs in DURING this visit", () => {
    session = { ...base }; // arrives unauthenticated
    const { rerender } = render(<AuthScreen />);
    session = member; // signs in this visit
    rerender(<AuthScreen />);
    expect(replace).toHaveBeenCalledWith(DASHBOARD_HOME);
  });

  it("Continue takes an already-signed-in member to the dashboard", () => {
    session = member;
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(replace).toHaveBeenCalledWith(DASHBOARD_HOME);
  });

  it("Switch account signs out", () => {
    session = member;
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("button", { name: /switch account/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
