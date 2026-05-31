# Frontend: billing page, banner, and 402 client interceptor

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/billing-subscription-gate/PRD.md`

## What to build

The customer-facing billing surface.

- A **402 interceptor** in the API client: a 402 (subscription required) becomes
  a typed billing signal that routes the user to `/billing` instead of surfacing
  a raw error.
- A **`/billing` page** showing the Company's subscription status (trial days
  left / active / past due / blocked) with a **Subscribe** action (redirect to
  Stripe Checkout) and a **Manage** action (redirect to the Stripe portal),
  using the Issue 05 endpoints.
- A **banner** in the app shell that warns when the trial is ending soon or a
  payment is past due.

## Acceptance criteria

- [ ] A 402 from the API client routes the user to `/billing` (not a raw error).
- [ ] `/billing` shows the subscription status and Subscribe / Manage actions that redirect to Stripe Checkout / Portal.
- [ ] The banner renders the trial-ending and past-due states (and nothing when active).
- [ ] Component tests (jsdom + Testing Library) cover the banner states and the 402 → `/billing` behaviour, reusing the existing jsdom setup + `@/` alias.

## Blocked by

- `.scratch/billing-subscription-gate/issues/03-subscription-gate-middleware.md`
- `.scratch/billing-subscription-gate/issues/05-billing-service-and-routes.md`
