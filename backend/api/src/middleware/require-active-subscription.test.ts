import { beforeAll, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import {
  JwtMinter,
  generateAccessKeyPair,
  InMemoryRevocationStore,
} from "@vendme/auth";
import type { SubscriptionLike } from "../modules/billing/entitlement.logic.js";

// env.ts / @vendme/db read config at import; set a dummy DSN before importing the
// gate (its default lookup imports @vendme/db, but the injected lookup never hits it).
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const COMPANY = "11111111-1111-1111-1111-111111111111";
const ACCOUNT = "22222222-2222-2222-2222-222222222222";
const SID = "33333333-3333-3333-3333-333333333333";
const DAY_MS = 24 * 60 * 60 * 1000;

let minter: JwtMinter;
let revocations: InMemoryRevocationStore;
let requireActiveSubscription: typeof import("./require-active-subscription.js").requireActiveSubscription;
let authenticate: typeof import("./authenticate.js").authenticate;
let errorHandler: typeof import("./error.js").errorHandler;

type Lookup = (companyId: string) => Promise<SubscriptionLike | null>;

function mintToken(): Promise<string> {
  return minter.mint({ accountId: ACCOUNT, companyId: COMPANY, role: "cashier", sid: SID });
}

/** Tiny app: a gated route and an exempt (gate-free) route behind the same auth. */
function buildApp(lookup: Lookup): Express {
  const app = express();
  app.use(express.json());
  const auth = authenticate(revocations);
  const gate = requireActiveSubscription(lookup);
  app.get("/gated", auth, gate, (_req, res) => res.json({ ok: true }));
  app.get("/exempt", auth, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

beforeAll(async () => {
  const { privateKeyPkcs8, publicKeySpki } = await generateAccessKeyPair();
  delete process.env.JWKS_URL;
  process.env.JWT_PUBLIC_KEY = publicKeySpki;
  minter = await JwtMinter.fromPkcs8(privateKeyPkcs8);
  revocations = new InMemoryRevocationStore();

  ({ requireActiveSubscription } = await import("./require-active-subscription.js"));
  ({ authenticate } = await import("./authenticate.js"));
  ({ errorHandler } = await import("./error.js"));
});

describe("requireActiveSubscription", () => {
  it("lets an active subscription through to the gated route", async () => {
    const app = buildApp(async () => ({ status: "active", currentPeriodEnd: null }));
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("lets a trial that is still in its period through", async () => {
    const app = buildApp(async () => ({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + 5 * DAY_MS),
    }));
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(200);
  });

  it("lets a past_due subscription within the grace window through", async () => {
    const app = buildApp(async () => ({
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() - 1 * DAY_MS),
    }));
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(200);
  });

  it("blocks a Company with no subscription (402 subscription_required)", async () => {
    const app = buildApp(async () => null);
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("subscription_required");
  });

  it("blocks an expired trial (402 trial_expired)", async () => {
    const app = buildApp(async () => ({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() - 1 * DAY_MS),
    }));
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("trial_expired");
  });

  it("blocks a past_due subscription past its grace window (402 past_due)", async () => {
    const app = buildApp(async () => ({
      status: "past_due",
      currentPeriodEnd: new Date(Date.now() - 5 * DAY_MS),
    }));
    const res = await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(402);
    expect(res.body.error).toBe("past_due");
  });

  it("calls the lookup with the company resolved from the token", async () => {
    const lookup = vi.fn<Lookup>(async () => ({ status: "active", currentPeriodEnd: null }));
    const app = buildApp(lookup);
    await request(app).get("/gated").set("Authorization", `Bearer ${await mintToken()}`);
    expect(lookup).toHaveBeenCalledWith(COMPANY);
  });

  it("fails closed with 401 (never reaching the gate) when unauthenticated", async () => {
    const lookup = vi.fn<Lookup>(async () => null);
    const app = buildApp(lookup);
    const res = await request(app).get("/gated");
    expect(res.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("does not gate a route the middleware is not mounted on (exemption is per-mount)", async () => {
    // The exempt route shares auth but not the gate; a blocking lookup must not
    // affect it — this is how /v1/auth, /v1/companies and /v1/billing stay open.
    const app = buildApp(async () => null);
    const res = await request(app).get("/exempt").set("Authorization", `Bearer ${await mintToken()}`);
    expect(res.status).toBe(200);
  });
});
