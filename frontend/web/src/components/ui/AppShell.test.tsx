// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

let mockPath = "/pos/b1";
vi.mock("next/navigation", () => ({ usePathname: () => mockPath }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AppShell } from "./AppShell";
import { useSidebarStore } from "@/lib/shell/sidebar-store";

const nav = { role: "super_admin", permissions: ["*"], enabledModules: { restaurant: true } };

afterEach(() => {
  cleanup();
  useSidebarStore.setState({ collapsed: false });
  mockPath = "/pos/b1";
});

describe("AppShell", () => {
  it("renders the nav generated from context, with the branch derived from the path", () => {
    render(<AppShell navContext={nav}>workspace</AppShell>);
    const bar = within(screen.getByTestId("sidebar"));
    expect(bar.getByRole("link", { name: /register/i }).getAttribute("href")).toBe("/pos/b1");
    // restaurant module enabled → Floor + Kitchen present
    expect(bar.getByRole("link", { name: /floor/i })).toBeTruthy();
    expect(bar.getByRole("link", { name: /kitchen/i })).toBeTruthy();
    expect(screen.getByText("workspace")).toBeTruthy();
  });

  it("highlights the active route from the current path", () => {
    mockPath = "/shifts/b1";
    render(<AppShell navContext={nav}>x</AppShell>);
    const bar = within(screen.getByTestId("sidebar"));
    expect(bar.getByRole("link", { name: /shifts/i }).getAttribute("aria-current")).toBe("page");
    expect(bar.getByRole("link", { name: /register/i }).getAttribute("aria-current")).toBeNull();
  });

  it("toggles the desktop collapsed state", () => {
    render(<AppShell navContext={nav}>x</AppShell>);
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe("true");
  });

  it("opens and closes the mobile drawer (hamburger + backdrop)", () => {
    render(<AppShell navContext={nav}>x</AppShell>);
    expect(screen.getByTestId("app-sidebar").getAttribute("data-state")).toBe("closed");
    expect(screen.queryByTestId("drawer-backdrop")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByTestId("app-sidebar").getAttribute("data-state")).toBe("open");
    expect(screen.getByTestId("drawer-backdrop")).toBeTruthy();

    fireEvent.click(screen.getByTestId("drawer-backdrop"));
    expect(screen.getByTestId("app-sidebar").getAttribute("data-state")).toBe("closed");
  });

  it("closes the drawer when a nav link is tapped", () => {
    render(<AppShell navContext={nav}>x</AppShell>);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByTestId("app-sidebar").getAttribute("data-state")).toBe("open");
    fireEvent.click(within(screen.getByTestId("sidebar")).getByRole("link", { name: /register/i }));
    expect(screen.getByTestId("app-sidebar").getAttribute("data-state")).toBe("closed");
  });
});
