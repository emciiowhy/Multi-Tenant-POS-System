# Tenant API gate: requireActiveSubscription middleware

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

A `requireActiveSubscription` middleware that runs after `authenticate` (so the
Company is resolved from `req.ctx`), loads that Company's subscription through an
**injectable lookup**, applies `decideAccess` (Issue 01), and returns **402
Payment Required** with a machine-readable code (`subscription_required` /
`trial_expired` / `past_due`) when blocked.

It is mounted on the tenant API — POS, inventory, catalog, shifts, and the
restaurant module — and **exempts** `/v1/auth/*`, `/v1/companies/*` (including
company-switch), and `/v1/billing/*`, so a lapsed Company can still authenticate,
switch companies, and pay.

The subscription lookup is injected (the same pattern as the restaurant module
gate's `isModuleEnabled` and the realtime gateway's `authorizeBranch`) so the
integration tests need no database.

## Acceptance criteria

- [x] An entitled Company (active / trialing-in-period / past_due-in-grace) passes a gated tenant route.
- [x] A blocked Company receives 402 with a machine-readable code matching the policy reason.
- [x] `/v1/auth/*`, `/v1/companies/*` (incl. switch), and `/v1/billing/*` are NOT gated.
- [x] The subscription lookup is injectable; integration tests run without a database (entitled passes, blocked 402s, exempt routes unaffected).
- [x] Tests mirror the gateway's injected-authorizer tests and `server.test.ts` route assertions.
- [x] SEQUENCING: mounting the gate blocks any Company without a subscription, so this must ship together with Issue 04 (trial + backfill); document that existing/demo Companies are locked out until 04 lands.

## Blocked by

- `.scratch/billing-subscription-gate/issues/01-entitlement-policy.md`
- Ship together with `.scratch/billing-subscription-gate/issues/04-trial-seeding-and-backfill.md` (avoids locking out existing Companies).

## Comments

**Done (2026-06-01), red-green, shipped with issue 04.** `backend/api/src/middleware/require-active-subscription.ts`: `requireActiveSubscription(lookup = loadSubscription, now = () => new Date())` — runs after `authenticate`, loads the Company's subscription through the **injected** lookup, applies `decideAccess` (issue 01), and on a block throws **402** carrying a machine code (`no_subscription` → `subscription_required`; otherwise the policy reason: `trial_expired` / `past_due` / `canceled` / `unpaid` / `incomplete`) via a new `paymentRequired` helper in `lib/context.ts`. The error mapper surfaces the code as `{ error: <code> }`.

Mounted on every tenant surface: the 4 core routers (pos / inventory / catalog / shifts) compose it into their per-route `auth` chain (`auth = [authenticate(revocations), requireActiveSubscription()]`, flattened by Express — zero per-route edits), and the module seam (`mountModules`) runs it after `authenticate` and before the enablement `moduleGate` so a lapsed Company gets 402, not a 404 that would leak whether the module is on. `/v1/auth`, `/v1/companies` (incl. company-switch) and `/v1/billing` are simply never mounted with the gate, so they stay open.

`require-active-subscription.test.ts` (9 DB-free integration tests, mirroring the gateway's injected-authorizer style + minted EdDSA tokens): active / in-trial / in-grace pass (200); no-sub / expired-trial / past-grace → 402 with the matching code; lookup receives the company from the token; unauthenticated fails closed at 401 without reaching the gate; an un-gated route is unaffected by a blocking lookup (the exemption model). `server.test.ts` still shows 401 (not 404) on all tenant routes — auth fires before the gate. Backend 70 tests; full suite 11/11; typecheck clean; `verify:live` exercises the real loadSubscription path against Postgres (PGlite) — see issue 04.
