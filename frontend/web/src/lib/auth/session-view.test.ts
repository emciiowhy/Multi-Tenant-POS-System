import { describe, expect, it } from "vitest";
import { buildSessionView, initialsFor, type RawSession } from "./session-view";

describe("initialsFor", () => {
  it("takes the first + last initial of a multi-word name", () => {
    expect(initialsFor("Jane Doe")).toBe("JD");
    expect(initialsFor("Jane Q Doe")).toBe("JD");
  });

  it("takes the first two letters of a single-word name", () => {
    expect(initialsFor("madonna")).toBe("MA");
  });

  it("derives initials from an email local-part when no name", () => {
    expect(initialsFor("jane@example.com")).toBe("JA");
    expect(initialsFor("john.smith@example.com")).toBe("JS");
  });

  it("falls back to '?' for empty / whitespace / nullish", () => {
    expect(initialsFor("")).toBe("?");
    expect(initialsFor("   ")).toBe("?");
    expect(initialsFor(null)).toBe("?");
    expect(initialsFor(undefined)).toBe("?");
  });
});

const fullSession: RawSession = {
  accountId: "acc-1",
  activeCompanyId: "c2",
  memberships: [
    { companyId: "c1", companyName: "Acme Coffee", companySlug: "acme", roleKey: "company_owner" },
    { companyId: "c2", companyName: "Bean Bros", companySlug: "bean", roleKey: "manager" },
  ],
  user: { name: "Jane Doe", email: "jane@example.com", image: null },
};

describe("buildSessionView", () => {
  it("broadcasts profile details, the active company, and the membership list", () => {
    const view = buildSessionView({ status: "authenticated", session: fullSession });

    expect(view.status).toBe("authenticated");
    expect(view.account).toEqual({
      id: "acc-1",
      name: "Jane Doe",
      email: "jane@example.com",
      imageUrl: null,
      initials: "JD",
    });
    expect(view.companies.map((c) => c.id)).toEqual(["c1", "c2"]);
    // Active company is the one matching session.activeCompanyId.
    expect(view.activeCompany?.id).toBe("c2");
    expect(view.activeCompany?.name).toBe("Bean Bros");
    expect(view.companies.find((c) => c.id === "c2")?.isActive).toBe(true);
    expect(view.companies.find((c) => c.id === "c1")?.isActive).toBe(false);
  });

  it("broadcasts the enabledModules it is given", () => {
    const view = buildSessionView(
      { status: "authenticated", session: fullSession },
      { enabledModules: { restaurant: true } },
    );
    expect(view.enabledModules).toEqual({ restaurant: true });
  });

  it("defaults enabledModules to an empty map", () => {
    const view = buildSessionView({ status: "authenticated", session: fullSession });
    expect(view.enabledModules).toEqual({});
  });

  it("reports a loading view with no profile while the session resolves", () => {
    const view = buildSessionView({ status: "loading", session: null });
    expect(view.status).toBe("loading");
    expect(view.account).toBeNull();
    expect(view.activeCompany).toBeNull();
    expect(view.companies).toEqual([]);
  });

  it("reports unauthenticated when there is no session / accountId", () => {
    expect(buildSessionView({ status: "unauthenticated", session: null }).status).toBe(
      "unauthenticated",
    );
    expect(
      buildSessionView({ status: "authenticated", session: { accountId: null } }).status,
    ).toBe("unauthenticated");
  });

  it("falls back to the email as the display name when no name is set", () => {
    const view = buildSessionView({
      status: "authenticated",
      session: { ...fullSession, user: { name: null, email: "owner@shop.io", image: null } },
    });
    expect(view.account?.name).toBe("owner@shop.io");
    expect(view.account?.initials).toBe("OW");
  });

  it("exposes the avatar image url when present", () => {
    const view = buildSessionView({
      status: "authenticated",
      session: { ...fullSession, user: { name: "Jane Doe", email: null, image: "https://x/a.png" } },
    });
    expect(view.account?.imageUrl).toBe("https://x/a.png");
  });
});
