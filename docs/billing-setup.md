# Billing setup (Stripe)

How to turn on live billing for the subscription gate. The architecture and the
"why" are in [ADR-0012](adr/0012-billing-subscription-gate.md); this is the
operator checklist.

> The gate and the free trial work **without** any of this — a new Company is
> seeded `trialing` and can use the product. Stripe is only needed to accept
> payment and to keep a subscription active past the trial.

## 1. Environment variables

Set these in the API's environment (`backend/.env`, which is gitignored;
placeholders are in `backend/api/.env.example`). They are already passed through
the Turbo `globalEnv`.

| Var | Required | What it is |
|-----|----------|------------|
| `STRIPE_SECRET_KEY` | yes | Stripe secret key (`sk_test_…` / `sk_live_…`). |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret for the webhook endpoint (`whsec_…`). |
| `STRIPE_PRICE_STANDARD` | yes | Stripe **price** id for the `standard` plan (`price_…`). |
| `BILLING_SUCCESS_URL` | no | Checkout success redirect. Default `WEB_ORIGIN/billing?status=success`. |
| `BILLING_CANCEL_URL` | no | Checkout cancel redirect. Default `WEB_ORIGIN/billing?status=canceled`. |
| `BILLING_PORTAL_RETURN_URL` | no | Portal return URL. Default `WEB_ORIGIN/billing`. |

If `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are unset, the billing routes
throw a clear "billing is not configured" error when called — by design, never
at boot.

## 2. Stripe dashboard

1. **Product + price.** Create a Product with a **recurring monthly Price**, copy
   its price id into `STRIPE_PRICE_STANDARD`. The app's seeded plan key is
   `standard`; the provider maps `standard → STRIPE_PRICE_STANDARD`. (Add more
   plans later by extending the plan→price map.)
2. **Customer portal.** Settings → Billing → Customer portal → activate it, so
   `POST /v1/billing/portal` (the "Manage" button) can return a portal URL.
3. **Webhook endpoint.** Developers → Webhooks → add endpoint
   `https://<your-api-host>/v1/billing/webhook`, subscribed to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

   Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET`. Events we
   don't model are ignored, so subscribing to extras is harmless.

## 3. Local development

Use the Stripe CLI to forward events to the local API (no public URL needed):

```
stripe login
stripe listen --forward-to localhost:4000/v1/billing/webhook
```

`stripe listen` prints a `whsec_…` — use that as `STRIPE_WEBHOOK_SECRET` for
local dev. Then exercise the flow:

```
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

The webhook verifies the signature against the raw body, runs the pure reducer,
and upserts the local `subscriptions` mirror; `GET /v1/billing/subscription`
should reflect the new status.

## 4. Backfill before enforcing the gate

Companies created before billing existed have no subscription, so the gate would
402 them. Seed/backfill grants a `trialing` subscription to any Company lacking
one:

```
pnpm --filter @vendme/backend-api seed   # idempotent; backfills on re-run
```

Run this against the target database (e.g. Neon) before the gate is enforced, so
existing Companies — including the demo — stay usable.

## How the pieces fit

- **Trial:** every Company is seeded `trialing` on creation; the gate allows it
  until the trial ends.
- **Subscribe:** the `/billing` page's *Subscribe* button starts Stripe Checkout;
  *Manage* opens the Stripe portal.
- **Sync:** the webhook mirrors Stripe status locally; the gate reads only the
  local mirror per request (fast, and resilient to a Stripe outage).
- **Lockout:** a blocked request gets `402` + a machine code; the web client
  routes to `/billing` and the offline POS outbox pauses (without losing queued
  sales) until billing is restored.
