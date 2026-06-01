import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { InMemoryRevocationStore } from "@vendme/auth";
import type { AccessTokenClaims } from "@vendme/contracts";

// Control the verified claims without crypto/keys.
const verifyAccessToken = vi.fn();
vi.mock("../lib/jwks.js", () => ({
  verifyAccessToken: (...a: unknown[]) => verifyAccessToken(...a),
}));

import { authenticate } from "./authenticate.js";
import { authenticateAccount } from "./authenticate-account.js";

const flush = () => new Promise((r) => setImmediate(r));

const companyClaims: AccessTokenClaims = {
  sub: "acc-1",
  company: "co-1",
  role: "cashier",
  sid: "sid-1",
  iat: 0,
  exp: 0,
};
// An onboarding token carries no `company` claim.
const onboardingClaims = { sub: "acc-1", role: "", sid: "sid-1", iat: 0, exp: 0 } as AccessTokenClaims;

function run(mw: ReturnType<typeof authenticate>) {
  const req = { headers: { authorization: "Bearer t" } } as unknown as Request;
  const next = vi.fn();
  mw(req, {} as Response, next);
  return { req, next };
}

afterEach(() => verifyAccessToken.mockReset());

describe("authenticate (company-scoped guard)", () => {
  it("attaches the company-scoped context for a normal token", async () => {
    verifyAccessToken.mockResolvedValue(companyClaims);
    const { req, next } = run(authenticate(new InMemoryRevocationStore()));
    await flush();
    expect(next).toHaveBeenCalledWith();
    expect(req.ctx).toEqual({ accountId: "acc-1", companyId: "co-1", role: "cashier", sid: "sid-1" });
  });

  it("rejects a company-less onboarding token (company routes require a tenant)", async () => {
    verifyAccessToken.mockResolvedValue(onboardingClaims);
    const { req, next } = run(authenticate(new InMemoryRevocationStore()));
    await flush();
    const err = next.mock.calls[0]?.[0] as { status?: number } | undefined;
    expect(err?.status).toBe(401);
    expect(req.ctx).toBeUndefined();
  });
});

describe("authenticateAccount (onboarding guard)", () => {
  it("accepts a company-less onboarding token and attaches the account id", async () => {
    verifyAccessToken.mockResolvedValue(onboardingClaims);
    const { req, next } = run(authenticateAccount(new InMemoryRevocationStore()));
    await flush();
    expect(next).toHaveBeenCalledWith();
    expect(req.ctx?.accountId).toBe("acc-1");
  });

  it("also accepts a normal company-bearing token (add-another-company)", async () => {
    verifyAccessToken.mockResolvedValue(companyClaims);
    const { req, next } = run(authenticateAccount(new InMemoryRevocationStore()));
    await flush();
    expect(next).toHaveBeenCalledWith();
    expect(req.ctx?.accountId).toBe("acc-1");
  });

  it("still rejects a revoked session", async () => {
    verifyAccessToken.mockResolvedValue(onboardingClaims);
    const store = new InMemoryRevocationStore();
    await store.revoke("sid-1", 60);
    const { next } = run(authenticateAccount(store));
    await flush();
    const err = next.mock.calls[0]?.[0] as { status?: number } | undefined;
    expect(err?.status).toBe(401);
  });
});
