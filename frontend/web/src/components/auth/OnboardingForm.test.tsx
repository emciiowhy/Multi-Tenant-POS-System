// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AppSession } from "./SessionProvider";

const createCompany = vi.fn();
vi.mock("@/app/actions/create-company", () => ({
  createCompany: (...a: unknown[]) => createCompany(...a),
}));

const addCompany = vi.fn(async () => {});
let session: AppSession;
vi.mock("./SessionProvider", () => ({ useAppSession: () => session }));

import { OnboardingForm } from "./OnboardingForm";

const base = {
  status: "authenticated",
  account: { id: "a", name: "Jane", email: null, imageUrl: null, initials: "J" },
  activeCompany: null,
  companies: [],
  enabledModules: {},
  switchCompany: vi.fn(),
  signOut: vi.fn(),
  addCompany,
} as unknown as AppSession;

const slugInput = () => screen.getByLabelText(/workspace url/i) as HTMLInputElement;
const setName = (v: string) =>
  fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: v } });

beforeEach(() => {
  session = { ...base };
});
afterEach(() => {
  cleanup();
  createCompany.mockReset();
  addCompany.mockReset();
});

describe("OnboardingForm", () => {
  it("auto-suggests a slug from the business name", () => {
    render(<OnboardingForm />);
    setName("Acme Coffee");
    expect(slugInput().value).toBe("acme-coffee");
  });

  it("stops auto-suggesting once the slug is edited by hand", () => {
    render(<OnboardingForm />);
    setName("Acme Coffee");
    fireEvent.change(slugInput(), { target: { value: "my-cafe" } });
    setName("Acme Coffee Roasters");
    expect(slugInput().value).toBe("my-cafe");
  });

  it("creates the company and folds the new tenant into the session", async () => {
    createCompany.mockResolvedValue({
      ok: true,
      membership: { companyId: "c9", companyName: "Acme", companySlug: "acme", roleKey: "company_owner" },
    });
    render(<OnboardingForm />);
    setName("Acme");
    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));
    expect(createCompany).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme", slug: "acme", industry: "retail" }),
    );
    await waitFor(() =>
      expect(addCompany).toHaveBeenCalledWith({
        companyId: "c9",
        companyName: "Acme",
        companySlug: "acme",
        roleKey: "company_owner",
      }),
    );
  });

  it("surfaces a taken workspace URL as a slug field error and does not advance", async () => {
    createCompany.mockResolvedValue({ ok: false, error: "slug_taken" });
    render(<OnboardingForm />);
    setName("Acme");
    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));
    await waitFor(() => expect(slugInput().getAttribute("aria-invalid")).toBe("true"));
    expect(addCompany).not.toHaveBeenCalled();
  });
});
