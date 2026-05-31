# Billing service & routes (Stripe Checkout / Portal / webhook)

Status: ready-for-agent
Type: AFK (build); live verification needs Stripe test config

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

The Stripe-facing billing layer.

Service:
- `createCheckoutSession(companyId, planKey)` — subscription-mode Checkout;
  ensures a Stripe Customer for the Company and stores `stripeCustomerId`.
- `createPortalSession(companyId)` — Stripe billing-portal URL.
- `getSubscription(companyId)` — status + plan + period end for the UI.
- `applyWebhook(rawBody, signature)` — verify the signature → run the reducer
  (Issue 02) → upsert the subscription idempotently, and record `invoices` on
  invoice events.

Routes (all exempt from the tenant gate):
- `GET /v1/billing/subscription` — authenticated; any member may read status.
- `POST /v1/billing/checkout` — `billing:subscription:manage`.
- `POST /v1/billing/portal` — `billing:subscription:manage`.
- `POST /v1/billing/webhook` — unauthenticated; Stripe signature-verified.

The webhook route must receive the **raw request body** for signature
verification (it conflicts with the global JSON parser — mount raw parsing for
that path).

## Acceptance criteria

- [x] `GET /v1/billing/subscription` returns the Company's status + plan + period end.
- [x] `POST /v1/billing/checkout` (perm `billing:subscription:manage`) returns a Checkout URL and ensures a Stripe Customer.
- [x] `POST /v1/billing/portal` returns a billing-portal URL.
- [x] `POST /v1/billing/webhook` verifies the signature against `STRIPE_WEBHOOK_SECRET`, applies the reducer (Issue 02), and upserts the subscription idempotently using the raw body.
- [x] The billing routes are exempt from the gate (a lapsed Company can still call them).
- [x] `server.test` asserts the routes are mounted and protected (checkout/portal require auth + perm; the webhook is unauthenticated but signature-gated).
- [ ] PREREQUISITE (human/config, not code): Stripe test keys, a price id per plan, and `STRIPE_WEBHOOK_SECRET`. — env + turbo + `.env.example` plumbing is in place; only real Stripe values remain (human).

## Blocked by

- `.scratch/billing-subscription-gate/issues/02-stripe-webhook-reducer.md`

## Comments

**Done (2026-06-01), red-green (provider unit) + live-verified.** Installed `stripe@^22`.

`modules/billing/billing.provider.ts` — the Stripe boundary behind an injectable `BillingProvider` interface (mirrors the gate's `loadSubscription`, the module seam's `isModuleEnabled`, the gateway's `authorizeBranch`): `ensureCustomer`, `createCheckoutSession` (subscription mode, price from a plan→price map, stamps `companyId` metadata), `createPortalSession`, and `constructEvent` (verifies the signature, then `toStripeEventLike` normalises Stripe's object — incl. invoice period-end from the line item — into the reducer's minimal shape). `getDefaultProvider()` builds the real one lazily from env, throwing a clear error only when a billing route is actually used unconfigured (never at boot/in tests). Unit test (`billing.provider.test.ts`, 4) uses Stripe's own `generateTestHeaderString` for deterministic offline signature checks: valid sub/invoice events map correctly, forged + tampered signatures throw.

`modules/billing/billing.service.ts` — `getSubscription` (local read, joins `plans`), `createCheckoutSession` (ensures + persists `stripeCustomerId`, Stripe calls OUTSIDE the DB tx), `createPortalSession`, and `applyWebhook` (verify→reduce→upsert). The webhook identifies the Company only by Stripe customer id, so the lookup/upsert runs on the audited cross-company path `withoutTenantScope` (ADR-0001) — never a tenant GUC; idempotent via upsert-by-customer + reducer; records a best-effort `invoices` row (de-duped by the company+number unique key). Extended `StripeObjectLike` with optional `number`/`amountPaid` (additive; reducer ignores them).

`billing.routes.ts` mounted at `/v1/billing` (NOT gated): `GET /subscription` (auth, any member), `POST /checkout` + `POST /portal` (`billing:subscription:manage`), `POST /webhook` (unauthenticated, signature-gated — 400 without the header). `server.ts` mounts `express.raw` for `/v1/billing/webhook` ahead of `express.json` so signature verification gets the raw body. New optional env (`STRIPE_*`, `BILLING_*_URL`) added to `env.ts`, `turbo.json` globalEnv, and `.env.example` (placeholders).

Verification: backend **75 tests** (4 provider + a billing `server.test` assertion), full suite **12/12**, typecheck clean across 8 packages. `verify:live` section [5] drives the real SQL against PGlite with an injected fake provider — **16/16**: checkout links a customer, a verified `subscription.updated` flips the mirror to `active`, re-delivery is idempotent, and `subscription.deleted` cancels it. Live Stripe (real keys/webhook) is the documented human prerequisite, not built here.
