// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { NavItem } from "@/lib/shell/nav-model";

// next/link → a plain anchor so clicks/handlers work without an app router.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Sidebar } from "./Sidebar";

const items: NavItem[] = [
  { key: "pos", label: "Register", href: "/pos/b1" },
  { key: "shifts", label: "Shifts", href: "/shifts/b1" },
  { key: "billing", label: "Billing", href: "/billing" },
];

const noop = () => {};

afterEach(cleanup);

describe("Sidebar", () => {
  it("renders each nav item as a link with its href", () => {
    render(<Sidebar items={items} pathname="/pos/b1" collapsed={false} onToggleCollapse={noop} />);
    expect(screen.getByRole("link", { name: /register/i }).getAttribute("href")).toBe("/pos/b1");
    expect(screen.getByRole("link", { name: /shifts/i }).getAttribute("href")).toBe("/shifts/b1");
    expect(screen.getByRole("link", { name: /billing/i }).getAttribute("href")).toBe("/billing");
  });

  it("marks the active link (incl. nested route) with aria-current and not the others", () => {
    render(
      <Sidebar items={items} pathname="/pos/b1/receipt" collapsed={false} onToggleCollapse={noop} />
    );
    expect(screen.getByRole("link", { name: /register/i }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(screen.getByRole("link", { name: /shifts/i }).getAttribute("aria-current")).toBeNull();
  });

  it("reflects the collapsed state on the root", () => {
    const { rerender } = render(
      <Sidebar items={items} pathname="/billing" collapsed={false} onToggleCollapse={noop} />
    );
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe("false");
    rerender(<Sidebar items={items} pathname="/billing" collapsed onToggleCollapse={noop} />);
    expect(screen.getByTestId("sidebar").getAttribute("data-collapsed")).toBe("true");
  });

  it("calls onToggleCollapse when the collapse control is clicked", () => {
    const onToggle = vi.fn();
    render(
      <Sidebar items={items} pathname="/billing" collapsed={false} onToggleCollapse={onToggle} />
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onNavigate when a link is activated (so the mobile drawer can close)", () => {
    const onNavigate = vi.fn();
    render(
      <Sidebar
        items={items}
        pathname="/billing"
        collapsed={false}
        onToggleCollapse={noop}
        onNavigate={onNavigate}
      />
    );
    fireEvent.click(screen.getByRole("link", { name: /register/i }));
    expect(onNavigate).toHaveBeenCalled();
  });
});
