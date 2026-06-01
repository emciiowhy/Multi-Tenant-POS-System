// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { AppSession } from "./SessionProvider";

const switchCompany = vi.fn(async () => {});
let mockSession: AppSession;

vi.mock("./SessionProvider", () => ({ useAppSession: () => mockSession }));

import { TenantSwitcher } from "./TenantSwitcher";

const companies = [
  { id: "c1", name: "Acme Coffee", slug: "acme", role: "company_owner", isActive: true },
  { id: "c2", name: "Bean Bros", slug: "bean", role: "manager", isActive: false },
];

const authed: AppSession = {
  status: "authenticated",
  account: { id: "acc-1", name: "Jane Doe", email: "jane@x.io", imageUrl: null, initials: "JD" },
  activeCompany: companies[0]!,
  companies,
  enabledModules: {},
  switchCompany,
  signOut: vi.fn(),
};

beforeEach(() => {
  mockSession = authed;
});

afterEach(() => {
  cleanup();
  switchCompany.mockClear();
});

describe("TenantSwitcher", () => {
  it("renders a loading skeleton while the session resolves", () => {
    mockSession = { ...authed, status: "loading", companies: [], activeCompany: null };
    render(<TenantSwitcher />);
    expect(screen.getByTestId("tenant-switcher-skeleton")).toBeTruthy();
  });

  it("renders nothing when the account has no memberships", () => {
    mockSession = { ...authed, companies: [], activeCompany: null };
    const { container } = render(<TenantSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the active company on the trigger", () => {
    render(<TenantSwitcher />);
    expect(screen.getByTestId("tenant-switcher-trigger").textContent).toContain("Acme Coffee");
  });

  it("lists every authorized company and marks the active one", () => {
    render(<TenantSwitcher />);
    fireEvent.click(screen.getByTestId("tenant-switcher-trigger"));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(screen.getByRole("option", { name: /acme coffee/i }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("option", { name: /bean bros/i }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("invokes the context switch with the chosen company id on select", () => {
    render(<TenantSwitcher />);
    fireEvent.click(screen.getByTestId("tenant-switcher-trigger"));
    fireEvent.click(within(screen.getByRole("option", { name: /bean bros/i })).getByRole("button"));
    expect(switchCompany).toHaveBeenCalledWith("c2");
  });

  it("does not re-switch when the already-active company is chosen", () => {
    render(<TenantSwitcher />);
    fireEvent.click(screen.getByTestId("tenant-switcher-trigger"));
    fireEvent.click(within(screen.getByRole("option", { name: /acme coffee/i })).getByRole("button"));
    expect(switchCompany).not.toHaveBeenCalled();
  });
});
