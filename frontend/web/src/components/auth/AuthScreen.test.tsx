// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AppSession } from "./SessionProvider";

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

import { AuthScreen } from "./AuthScreen";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";

const base: AppSession = {
  status: "unauthenticated",
  account: null,
  activeCompany: null,
  companies: [],
  enabledModules: {},
  switchCompany: vi.fn(),
  signOut: vi.fn(),
};
const company = { id: "c1", name: "Acme", slug: "acme", role: "company_owner", isActive: true };

beforeEach(() => {
  params = new URLSearchParams();
  session = { ...base };
});
afterEach(() => {
  cleanup();
  replace.mockReset();
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

  it("redirects an authenticated member straight to the dashboard", () => {
    session = { ...base, status: "authenticated", account: { id: "a", name: "Jane", email: null, imageUrl: null, initials: "J" }, companies: [company], activeCompany: company };
    render(<AuthScreen />);
    expect(replace).toHaveBeenCalledWith("/billing");
  });

  it("routes an authenticated account with no tenant into onboarding (no redirect)", () => {
    session = { ...base, status: "authenticated", account: { id: "a", name: "Jane", email: null, imageUrl: null, initials: "J" }, companies: [] };
    render(<AuthScreen />);
    expect(screen.getByTestId("onboarding-stub")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
