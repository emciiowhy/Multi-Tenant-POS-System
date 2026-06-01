// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AppSession } from "./SessionProvider";

const signOut = vi.fn();
let mockSession: AppSession;

vi.mock("./SessionProvider", () => ({ useAppSession: () => mockSession }));

import { ProfileMenu } from "./ProfileMenu";

const authed: AppSession = {
  status: "authenticated",
  account: { id: "acc-1", name: "Jane Doe", email: "jane@x.io", imageUrl: null, initials: "JD" },
  activeCompany: { id: "c2", name: "Bean Bros", slug: "bean", role: "manager", isActive: true },
  companies: [],
  enabledModules: {},
  switchCompany: vi.fn(),
  signOut,
};

beforeEach(() => {
  mockSession = authed;
});

afterEach(() => {
  cleanup();
  signOut.mockClear();
});

describe("ProfileMenu", () => {
  it("renders a loading skeleton while the session resolves", () => {
    mockSession = { ...authed, status: "loading", account: null };
    render(<ProfileMenu />);
    expect(screen.getByTestId("profile-skeleton")).toBeTruthy();
  });

  it("renders nothing when unauthenticated", () => {
    mockSession = { ...authed, status: "unauthenticated", account: null };
    const { container } = render(<ProfileMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the user's initials when there is no avatar image", () => {
    render(<ProfileMenu />);
    expect(screen.getByTestId("profile-initials").textContent).toBe("JD");
    expect(screen.queryByTestId("profile-avatar")).toBeNull();
  });

  it("shows the avatar image when present", () => {
    mockSession = {
      ...authed,
      account: { ...authed.account!, imageUrl: "https://x/a.png" },
    };
    render(<ProfileMenu />);
    const img = screen.getByTestId("profile-avatar");
    expect(img.getAttribute("src")).toBe("https://x/a.png");
    expect(screen.queryByTestId("profile-initials")).toBeNull();
  });

  it("opens the menu showing the account + active company, and signs out", () => {
    render(<ProfileMenu />);
    fireEvent.click(screen.getByTestId("profile-trigger"));

    const menu = screen.getByRole("menu");
    expect(menu.textContent).toContain("Jane Doe");
    expect(menu.textContent).toContain("jane@x.io");
    expect(menu.textContent).toContain("Bean Bros");

    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
