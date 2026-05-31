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

- [ ] An entitled Company (active / trialing-in-period / past_due-in-grace) passes a gated tenant route.
- [ ] A blocked Company receives 402 with a machine-readable code matching the policy reason.
- [ ] `/v1/auth/*`, `/v1/companies/*` (incl. switch), and `/v1/billing/*` are NOT gated.
- [ ] The subscription lookup is injectable; integration tests run without a database (entitled passes, blocked 402s, exempt routes unaffected).
- [ ] Tests mirror the gateway's injected-authorizer tests and `server.test.ts` route assertions.
- [ ] SEQUENCING: mounting the gate blocks any Company without a subscription, so this must ship together with Issue 04 (trial + backfill); document that existing/demo Companies are locked out until 04 lands.

## Blocked by

- `.scratch/billing-subscription-gate/issues/01-entitlement-policy.md`
- Ship together with `.scratch/billing-subscription-gate/issues/04-trial-seeding-and-backfill.md` (avoids locking out existing Companies).
