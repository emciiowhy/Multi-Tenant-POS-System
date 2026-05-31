# Lifecycle: trial subscription on company creation + backfill

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

Make every Company usable from day one (ADR-0005) by seeding a trial, and make
sure enabling the gate (Issue 03) doesn't lock out Companies that predate billing.

- `createCompanyWithOwner` also creates a `trialing` subscription for the new
  Company (default plan, `currentPeriodEnd = now + TRIAL_DAYS`).
- A default plan exists in the global `plans` catalogue (seeded).
- A backfill gives every existing Company without a subscription a `trialing`
  subscription, so the gate doesn't lock them out.
- The demo seed creates the default plan and a trialing subscription for the
  demo Company.

## Acceptance criteria

- [x] Creating a Company also creates a `trialing` subscription (default plan, `currentPeriodEnd = now + TRIAL_DAYS`), in the same bootstrap path as roles/chart/owner membership.
- [x] A default plan row exists in the `plans` catalogue (seeded; `plans` is global, no company_id).
- [x] A backfill creates a trialing subscription for existing Companies that have none.
- [x] The demo seed creates the plan + a trialing subscription for the demo Company (so it stays usable once the gate is on).
- [x] After this + Issue 03, a freshly created Company and the demo Company pass the gate; a Company whose trial is manually expired is blocked.

## Blocked by

None - can start immediately. (Pairs with Issue 03 — land together so the gate doesn't lock out existing Companies.)

## Comments

**Done (2026-06-01), shipped with issue 03.** New `backend/api/src/modules/billing/subscription.service.ts` owns subscription I/O (the pure decision stays in `entitlement.logic`):

- `ensureDefaultPlan()` — idempotently seeds the single v1 `standard` plan in the global `plans` catalogue (`onConflictDoNothing` on the unique `key`), returns its id.
- `ensureTrialSubscription(companyId)` — creates a `trialing` subscription (default plan, `currentPeriodEnd = now + TRIAL_DAYS`) under `withCompany` if the Company has none; idempotent, returns whether it created one.
- `backfillTrialSubscriptions()` — gives every subscription-less Company a trial; returns the count.
- `loadSubscription(companyId)` — the gate's default lookup (issue 03).

`createCompanyWithOwner` now calls `ensureTrialSubscription` as a final bootstrap step, so every new Company is usable on day one and passes the gate. The demo seed backfills on its idempotent re-seed path (`backfillTrialSubscriptions()` after `ensureDemoAccess`), so the pre-billing demo Company — and any other — gets a trial when `pnpm seed` runs.

Verified for real: `verify:live` (in-process Postgres / PGlite) seeds the demo via the real `createCompanyWithOwner` path and asserts the demo Company is `trialing` and ALLOWED by the gate, that `ensureTrialSubscription` is idempotent (no duplicate), and that manually expiring `currentPeriodEnd` flips the same policy to BLOCKED — 12/12 checks pass. Backend 70 unit/integration tests; workspace typecheck clean across all 8 packages.
