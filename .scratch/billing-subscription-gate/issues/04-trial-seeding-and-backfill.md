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

- [ ] Creating a Company also creates a `trialing` subscription (default plan, `currentPeriodEnd = now + TRIAL_DAYS`), in the same bootstrap path as roles/chart/owner membership.
- [ ] A default plan row exists in the `plans` catalogue (seeded; `plans` is global, no company_id).
- [ ] A backfill creates a trialing subscription for existing Companies that have none.
- [ ] The demo seed creates the plan + a trialing subscription for the demo Company (so it stays usable once the gate is on).
- [ ] After this + Issue 03, a freshly created Company and the demo Company pass the gate; a Company whose trial is manually expired is blocked.

## Blocked by

None - can start immediately. (Pairs with Issue 03 — land together so the gate doesn't lock out existing Companies.)
