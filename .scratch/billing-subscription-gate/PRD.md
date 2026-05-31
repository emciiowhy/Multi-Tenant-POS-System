# PRD — Billing / subscription gate

Status: ready-for-agent
Area: backend/api (billing module + tenant gate), frontend/web (billing + banner), ADR-0001 / ADR-0004 / ADR-0005 / ADR-0010
Provider: Stripe

## Problem Statement

VendMe is meant to be a SaaS from day one (ADR-0005), but today there is nothing
making it one. Any Company can use the entire product — POS, inventory,
restaurant, shifts, returns — indefinitely, for free. There is no trial, no way
to subscribe, no enforcement when a subscription lapses or was never started,
and no connection to a payment provider. The `plans` / `subscriptions` /
`invoices` tables exist but carry no logic. A business owner has no way to pay,
and the platform has no way to require payment.

## Solution

A subscription gate, per Company (the unit of tenancy and billing, ADR-0001).

Every Company starts on a free trial when it's created, so it's usable
immediately. To keep using the product past the trial, the Company must hold an
active Stripe subscription. The tenant API is gated: a request from a Company
that isn't entitled (no subscription, expired trial, or a lapsed subscription
past its grace period) is refused with **402 Payment Required**, and the app
sends the user to a billing screen to subscribe or fix payment. Billing routes
themselves stay open, so a lapsed Company can always pay its way back in.

Stripe Checkout starts and renews subscriptions; a signature-verified Stripe
webhook keeps each Company's subscription status mirrored locally (so the gate
is a fast local read, not a Stripe call per request); and a banner warns owners
before the trial ends or while a payment is past due.

## User Stories

1. As a Company Owner, I want a free trial when I create my Company, so that I can evaluate VendMe before paying.
2. As a Company Owner, I want to see how many days remain in my trial, so that I know when I must subscribe.
3. As a Company Owner, I want to start a paid subscription through a checkout flow, so that my team keeps access after the trial.
4. As a Company Owner, I want to manage billing (update card, cancel) through a portal, so that I stay in control of my subscription.
5. As a cashier, I want the product to keep working throughout the trial and while the subscription is active, so that my shift isn't interrupted.
6. As a cashier, when the Company's subscription has lapsed, I want a clear message that points to billing — not a cryptic error — so that I understand why I'm blocked.
7. As a Company Owner, I want a short grace period when a payment fails, so that a transient card problem doesn't lock out my store immediately.
8. As a Company Owner, I want my subscription status to update automatically after I pay or cancel in Stripe, so that the app reflects reality with no manual step.
9. As a Company Owner, I want a warning banner before the trial ends and while a payment is past due, so that I can act before lockout.
10. As the platform, I want Stripe webhooks to be signature-verified, so that a forged request can't grant or revoke a Company's access.
11. As the platform, I want webhook handling to be idempotent, so that a re-delivered event doesn't corrupt subscription state.
12. As a Company Owner with several companies, I want each Company billed by its own subscription, so that one Company lapsing doesn't affect another (ADR-0001).
13. As a Company Owner whose subscription lapsed, I want to still reach the billing screen and billing APIs, so that I can pay and restore access.
14. As a cashier who rang up sales offline before a lapse, I want a clear "subscription required" prompt instead of an endless retry, so that I know the queued sales are waiting on billing, not the network.
15. As a Company Owner, I want subscribing to be a one-time setup that then just works, so that I'm not re-entering payment details.
16. As a platform operator, I want internal cross-company/superadmin operations to bypass the tenant gate, so that tooling isn't blocked by billing.
17. As a developer, I want the entitlement decision to be a pure, deeply-tested function, so that the rules are provably correct across every status and the trial/grace boundaries.
18. As a developer, I want the gate enforced once as middleware on the tenant API, so that I'm not sprinkling subscription checks across every route.
19. As a developer, I want subscription status mirrored locally and read per request, so that the gate is fast and survives a Stripe outage (it uses the last known status).
20. As a Company Owner, I want a default plan and trial seeded so a freshly created (or demo) Company is immediately usable, so that onboarding isn't a dead end.
21. As a Company Owner, I want the price and plan name shown on the billing screen, so that I know what I'm paying for.
22. As an auditor, I want subscription/payment changes recorded (status transitions, invoices), so that there's a billing trail.
23. As a developer, I want the Stripe→local mapping isolated in a pure reducer, so that I can test event handling without calling Stripe.
24. As a Company Owner, I want the gate to never block the billing, auth, or company-switch paths, so that I can always log in, switch companies, and pay.
25. As a cashier, I want read access to my Company's subscription status (not management), so that the app can show me the lockout reason even though I can't change billing.

## Implementation Decisions

**Enforcement — per-request middleware.** A `requireActiveSubscription`
middleware runs after `authenticate` (so `req.ctx.companyId` is resolved), loads
the Company's subscription, applies the entitlement policy, and returns **402**
with a machine-readable code (e.g. `subscription_required`, `trial_expired`,
`past_due`) when blocked. It is mounted on the tenant API — POS, inventory,
catalog, shifts, and the restaurant module — and **exempts** `/v1/auth/*`,
`/v1/companies/*` (incl. company-switch), and `/v1/billing/*`, so a lapsed
Company can still authenticate, switch companies, and pay. The subscription
lookup is **injectable** (as the restaurant module gate injects `isModuleEnabled`
and the realtime gateway injects `authorizeBranch`) so the middleware is testable
without a database.

**Entitlement policy — a pure deep module.** `decideAccess(subscription | null,
now) → { allowed, reason }`:
- `null` → blocked (`no_subscription`).
- `active` → allowed.
- `trialing` → allowed while `now < currentPeriodEnd`, else blocked (`trial_expired`).
- `past_due` → allowed while `now < currentPeriodEnd + GRACE` (a configurable grace window), else blocked (`past_due`).
- `canceled` / `unpaid` / `incomplete` → blocked.
The grace window and trial length are configuration constants. This module is
the single source of the rules; nothing else decides entitlement.

**Status is mirrored locally; Stripe is the source of truth.** The gate reads
the local `subscriptions` row only — never calls Stripe per request — so it's
fast and resilient to a Stripe outage (degrades to the last known status). The
Stripe→local sync happens via the webhook.

**Stripe webhook reducer — a pure deep module.** Given a minimal typed Stripe
event (type + the relevant subscription/invoice fields), it returns the
subscription change to upsert (`status`, `currentPeriodEnd`, `stripeCustomerId`,
`stripeSubscriptionId`) or `null` for ignored events. It maps Stripe statuses to
our status strings and is idempotent (applying the same event twice yields the
same state). No Stripe SDK in the pure core.

**Trial on Company creation.** `createCompanyWithOwner` seeds a `subscriptions`
row (`status: "trialing"`, `currentPeriodEnd: now + TRIAL_DAYS`, default plan), so
a new — and the demo — Company is usable immediately. A default plan must exist
in the global `plans` catalogue (seeded).

**Billing service (DB + Stripe SDK).** `startTrial`, `createCheckoutSession`
(subscription mode; ensures a Stripe Customer and stores `stripeCustomerId`),
`createPortalSession`, `getSubscription` (status + plan + period end for the UI),
and `applyWebhook` (verify signature → reduce → upsert subscription, and record
`invoices` on invoice events).

**Billing routes (all gate-exempt).**
- `GET /v1/billing/subscription` — authenticated; any member may read status.
- `POST /v1/billing/checkout` — `billing:subscription:manage`.
- `POST /v1/billing/portal` — `billing:subscription:manage`.
- `POST /v1/billing/webhook` — unauthenticated; Stripe signature-verified.

**Webhook raw body.** Stripe signature verification needs the raw request body,
which conflicts with the global `express.json()`. The webhook route must receive
the raw body (mount `express.raw` for that path, ahead of JSON parsing).

**Offline outbox interaction (ADR-0009 / Phase 8b).** When a Company is blocked,
the replay engine's `submit` will get a 402. A 402 is neither a transport error
(must not back off forever) nor a per-event business rejection — the engine
treats it like the existing 401 branch: stop draining and surface a
"subscription required" prompt routing to `/billing`. The queued sales remain in
the outbox and replay once billing is restored (still idempotent via
`client_uuid`).

**Frontend.** A 402 interceptor in the API client throws a typed billing error /
routes to `/billing`. A `/billing` page shows the status (trial days left /
active / past due / blocked) with Subscribe (→ Checkout redirect) and Manage (→
Portal redirect) actions. A banner in the app shell warns when the trial is
ending soon or a payment is past due.

**New configuration.** `STRIPE_SECRET_KEY` (already in turbo globalEnv),
`STRIPE_WEBHOOK_SECRET` (new), a plan→Stripe-price mapping, and checkout
success/cancel URLs.

## Testing Decisions

Good tests assert external behaviour through a module's public interface — feed
inputs (including an injected `now` and Stripe event fixtures), assert the
decision/output — not internals. Prior art: `backend/api/src/modules/**/*.logic.test.ts`
(pos/shift logic), `frontend/web/src/lib/pos/**/*.test.ts` (cart/replay logic),
the injected-dependency tests in `realtime/gateway.test.ts`, the route-protection
assertions in `server.test.ts`, and the jsdom component tests under
`frontend/web/src/components/pos/`.

All four were requested:
1. **Entitlement policy** — `decideAccess` across every status, plus the
   trial-expiry and grace boundaries, with an injected `now`. Pure.
2. **Stripe webhook reducer** — event fixtures (`customer.subscription.updated`
   → active/past_due, `customer.subscription.deleted` → canceled, `invoice.paid`
   → active + period end, `invoice.payment_failed` → past_due) mapping to the
   expected subscription change; plus idempotency (same event twice). Pure.
3. **Gate middleware (integration)** — with an injected subscription lookup: an
   entitled Company passes a tenant route, a blocked Company gets 402, and
   billing/auth routes are exempt. Mirrors the gateway's injected-authorizer
   tests and `server.test.ts` route assertions.
4. **Frontend 402 interceptor / banner (jsdom + Testing Library)** — a 402 from
   the API client routes to `/billing`; the banner renders the trial-ending and
   past-due states. Reuses the existing jsdom + Testing Library setup.

## Out of Scope

- **Usage/quota enforcement** (seats, storage). Plan `limits` and `usage_counters`
  exist but are not enforced by the gate in v1 — entitlement is binary
  (active/trial/grace vs blocked).
- **Dunning emails** beyond, at most, enqueuing trial-ending / payment-failed
  notifications (Resend/BullMQ, ADR-0010). The email templates and schedule are a
  separate effort.
- **Plan-change / upgrade-downgrade UX** beyond what the Stripe billing portal
  provides; proration, coupons, and tax are Stripe's concern, not modeled here.
- **Per-Branch or per-seat billing** — billing is per Company (ADR-0001).
- **A platform/superadmin billing dashboard.**

## Further Notes

- **Idempotent webhooks:** Stripe re-delivers events; rely on the reducer being
  idempotent + upsert-by-Company, and/or record processed Stripe event ids to
  de-duplicate.
- **Security:** entitlement is never trusted from the client; the gate is
  server-side, and the webhook is signature-verified with `STRIPE_WEBHOOK_SECRET`.
- **Resilience:** because status is a local mirror, a Stripe outage doesn't lock
  everyone out — the gate uses the last synced status.
- **Demo/seed:** the demo seed must create a default plan and a trialing
  subscription so the existing demo Company stays usable after this lands.
- **Grace + trial length** live as named config constants so they're easy to tune.
- This completes the last unbuilt piece of the ADR-0005 v1 spine (multi-tenant
  core, POS, inventory, accounting posting, Restaurant vertical, and billing gate).

## Comments
