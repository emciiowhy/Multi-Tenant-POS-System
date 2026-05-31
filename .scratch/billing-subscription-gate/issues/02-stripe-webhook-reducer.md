# Pure core: Stripe webhook reducer

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

A pure reducer that maps a minimal, typed Stripe event to the local subscription
change to persist — or `null` for events we ignore. No Stripe SDK and no DB in
the pure core; it takes the event shape and returns the field changes
(`status`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`). It
maps Stripe subscription statuses to our status strings (trialing / active /
past_due / canceled / unpaid / incomplete) and is idempotent.

This is the unit that lets webhook handling (Issue 05) be tested without calling
Stripe.

## Acceptance criteria

- [x] `customer.subscription.updated` → a change carrying the mapped status + `currentPeriodEnd` (+ stripe ids).
- [x] `customer.subscription.deleted` → status `canceled`.
- [x] `invoice.paid` → `active` with the new period end; `invoice.payment_failed` → `past_due`.
- [x] Unrecognised event types → `null` (ignored, no change).
- [x] Applying the same event twice yields the same change (idempotent).
- [x] Unit tests drive it with event fixtures (no Stripe SDK in the pure core), mirroring the `*.logic.test.ts` pattern.

## Blocked by

None - can start immediately.

## Comments

**Done (2026-06-01), red-green.** `backend/api/src/modules/billing/stripe-webhook.logic.ts`: pure `reduceStripeEvent(event) → SubscriptionChange | null`. Maps `customer.subscription.created/updated` (status + `currentPeriodEnd` from `current_period_end` seconds + customer/sub ids), `.deleted` → `canceled`, `invoice.paid`/`invoice.payment_succeeded` → `active`, `invoice.payment_failed` → `past_due`; unrecognised types → `null`. Stripe statuses we don't model (incomplete_expired, paused, …) map to `canceled` (blocked). Reuses `SubscriptionStatus` from `entitlement.logic`. `SubscriptionChange` is partial — only the fields an event carries are set — so issue 05's upsert won't clobber unknown columns. Permissive `StripeObjectLike` keeps the core SDK-free; 8 fixture tests incl. idempotency. Backend 61 tests; typecheck clean.
