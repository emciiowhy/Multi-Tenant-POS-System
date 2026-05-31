# Pure core: entitlement policy (decideAccess)

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

The gate's brain as a pure, deeply-tested function: `decideAccess(subscription | null, now) → { allowed, reason }`. It encodes the entitlement rules over a subscription's `status` + `currentPeriodEnd` and nothing else — no DB, no Stripe, no I/O.

Rules:
- `active` → allowed.
- `trialing` → allowed while `now < currentPeriodEnd`; otherwise blocked (`trial_expired`).
- `past_due` → allowed while `now < currentPeriodEnd + GRACE`; otherwise blocked (`past_due`).
- `canceled` / `unpaid` / `incomplete` → blocked (reason mirrors the status).
- `null` (no subscription) → blocked (`no_subscription`).

The trial length and the grace window are named, configurable constants. `reason` is a machine-readable string the middleware/UI can branch on.

## Acceptance criteria

- [x] `active` is allowed; `trialing` is allowed while within `currentPeriodEnd`.
- [x] `trialing` past `currentPeriodEnd` is blocked with reason `trial_expired`.
- [x] `past_due` within the grace window is allowed; past the grace window it is blocked with reason `past_due`.
- [x] `canceled` / `unpaid` / `incomplete` / `null` are blocked with the corresponding reason.
- [x] The grace window and trial length are named constants, not magic numbers.
- [x] Unit tests (`*.logic.test.ts`) cover every status plus the trial-expiry and grace boundaries, using an injected `now`. No DB/Stripe.

## Blocked by

None - can start immediately.

## Comments

**Done (2026-06-01), red-green.** `backend/api/src/modules/billing/entitlement.logic.ts`: pure `decideAccess(subscription | null, now) → { allowed, reason }` over `status` + `currentPeriodEnd`; `PAST_DUE_GRACE_DAYS` (3) and `TRIAL_DAYS` (14) named constants (TRIAL_DAYS is for issue 04's seeding). Exports `SubscriptionStatus` / `SubscriptionLike` / `AccessReason` / `AccessDecision` for issues 02/03 to reuse. 9 unit tests cover every status + the trial-end boundary (now == periodEnd → expired), null period end, and the grace boundary, with an injected `now`. Backend 53 tests; typecheck clean. No DB/Stripe.
