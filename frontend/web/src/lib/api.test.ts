import { afterEach, describe, expect, it, vi } from "vitest";

// The token client is mocked so apiFetch doesn't try to mint a real token.
vi.mock("@/lib/access-token-client", () => ({
  getAccessToken: vi.fn(async () => ({
    accessToken: "test-token",
    company: { companyId: "c", companyName: "C", companySlug: "c", roleKey: "cashier" },
  })),
}));

import { apiFetch, ApiError, BillingRequiredError } from "./api";
import { onBillingRequired } from "./billing/billing-redirect";

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch billing (402) interceptor", () => {
  it("turns a 402 into a typed BillingRequiredError carrying the machine code", async () => {
    mockFetchOnce(402, { error: "trial_expired", message: "Subscription required" });
    await expect(apiFetch("/v1/pos/events")).rejects.toMatchObject({
      status: 402,
      code: "trial_expired",
    });
  });

  it("notifies billing-required subscribers with the code (so the app can route to /billing)", async () => {
    mockFetchOnce(402, { error: "past_due" });
    const seen: string[] = [];
    const off = onBillingRequired((code) => seen.push(code));
    await expect(apiFetch("/v1/pos/events")).rejects.toBeInstanceOf(BillingRequiredError);
    off();
    expect(seen).toEqual(["past_due"]);
  });

  it("defaults the code to subscription_required when the 402 body has none", async () => {
    mockFetchOnce(402, {});
    await expect(apiFetch("/v1/pos/events")).rejects.toMatchObject({ code: "subscription_required" });
  });

  it("still throws a plain ApiError (not BillingRequiredError) for other failures", async () => {
    mockFetchOnce(500, { error: "internal_error" });
    const err = await apiFetch("/v1/pos/events").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(BillingRequiredError);
    expect((err as ApiError).status).toBe(500);
  });

  it("resolves the JSON body on success", async () => {
    mockFetchOnce(200, { ok: true });
    await expect(apiFetch("/health")).resolves.toEqual({ ok: true });
  });
});
