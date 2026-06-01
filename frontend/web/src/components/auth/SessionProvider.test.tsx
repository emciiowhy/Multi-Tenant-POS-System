// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// --- next-auth/react is mocked so the bridge can be exercised without a real
//     /api/auth/session round-trip. ---
const updateSpy = vi.fn(async () => null);
const signOutSpy = vi.fn();
let sessionState: { data: unknown; status: string };

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ ...sessionState, update: updateSpy }),
  signOut: (...args: unknown[]) => signOutSpy(...args),
}));

const refreshSpy = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshSpy }) }));

import { SessionProvider, useAppSession } from "./SessionProvider";

const session = {
  accountId: "acc-1",
  activeCompanyId: "c2",
  memberships: [
    { companyId: "c1", companyName: "Acme Coffee", companySlug: "acme", roleKey: "company_owner" },
    { companyId: "c2", companyName: "Bean Bros", companySlug: "bean", roleKey: "manager" },
  ],
  user: { name: "Jane Doe", email: "jane@example.com", image: null },
};

function Probe() {
  const s = useAppSession();
  return (
    <div>
      <span data-testid="status">{s.status}</span>
      <span data-testid="name">{s.account?.name}</span>
      <span data-testid="initials">{s.account?.initials}</span>
      <span data-testid="active">{s.activeCompany?.name}</span>
      <span data-testid="count">{s.companies.length}</span>
      <span data-testid="restaurant">{String(s.enabledModules.restaurant ?? false)}</span>
      <button onClick={() => void s.switchCompany("c1")}>switch</button>
      <button onClick={() => s.signOut()}>logout</button>
      <button
        onClick={() =>
          void s.addCompany({
            companyId: "c9",
            companyName: "New Co",
            companySlug: "new-co",
            roleKey: "company_owner",
          })
        }
      >
        addco
      </button>
    </div>
  );
}

beforeEach(() => {
  sessionState = { data: session, status: "authenticated" };
});

afterEach(() => {
  cleanup();
  updateSpy.mockClear();
  signOutSpy.mockClear();
  refreshSpy.mockClear();
});

describe("SessionProvider", () => {
  it("broadcasts the profile, active company, membership count, and enabledModules", () => {
    render(
      <SessionProvider enabledModules={{ restaurant: true }}>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("authenticated");
    expect(screen.getByTestId("name").textContent).toBe("Jane Doe");
    expect(screen.getByTestId("initials").textContent).toBe("JD");
    expect(screen.getByTestId("active").textContent).toBe("Bean Bros");
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("restaurant").textContent).toBe("true");
  });

  it("switchCompany re-mints via useSession().update and refreshes the server tree", async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "switch" }));
    // microtask flush so the awaited update resolves before assertions
    await Promise.resolve();
    await Promise.resolve();
    expect(updateSpy).toHaveBeenCalledWith({ activeCompanyId: "c1" });
    expect(refreshSpy).toHaveBeenCalled();
  });

  it("addCompany folds a freshly-created tenant into the session and refreshes", async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "addco" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(updateSpy).toHaveBeenCalledWith({
      newMembership: {
        companyId: "c9",
        companyName: "New Co",
        companySlug: "new-co",
        roleKey: "company_owner",
      },
    });
    expect(refreshSpy).toHaveBeenCalled();
  });

  it("signOut delegates to next-auth", () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(signOutSpy).toHaveBeenCalled();
  });

  it("useAppSession returns a safe loading default when used outside a provider", () => {
    render(<Probe />);
    expect(screen.getByTestId("status").textContent).toBe("loading");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});
