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

- [ ] `GET /v1/billing/subscription` returns the Company's status + plan + period end.
- [ ] `POST /v1/billing/checkout` (perm `billing:subscription:manage`) returns a Checkout URL and ensures a Stripe Customer.
- [ ] `POST /v1/billing/portal` returns a billing-portal URL.
- [ ] `POST /v1/billing/webhook` verifies the signature against `STRIPE_WEBHOOK_SECRET`, applies the reducer (Issue 02), and upserts the subscription idempotently using the raw body.
- [ ] The billing routes are exempt from the gate (a lapsed Company can still call them).
- [ ] `server.test` asserts the routes are mounted and protected (checkout/portal require auth + perm; the webhook is unauthenticated but signature-gated).
- [ ] PREREQUISITE (human/config, not code): Stripe test keys, a price id per plan, and `STRIPE_WEBHOOK_SECRET`.

## Blocked by

- `.scratch/billing-subscription-gate/issues/02-stripe-webhook-reducer.md`
