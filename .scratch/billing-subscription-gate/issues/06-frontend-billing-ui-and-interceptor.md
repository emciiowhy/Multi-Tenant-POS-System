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

- [x] A 402 from the API client routes the user to `/billing` (not a raw error).
- [x] `/billing` shows the subscription status and Subscribe / Manage actions that redirect to Stripe Checkout / Portal.
- [x] The banner renders the trial-ending and past-due states (and nothing when active).
- [x] Component tests (jsdom + Testing Library) cover the banner states and the 402 → `/billing` behaviour, reusing the existing jsdom setup + `@/` alias.

## Blocked by

- `.scratch/billing-subscription-gate/issues/03-subscription-gate-middleware.md`
- `.scratch/billing-subscription-gate/issues/05-billing-service-and-routes.md`

## Comments

**Done (2026-06-01), red-green.** The 402 interception is split into a pure detect + a framework-free pub/sub seam so neither half needs a brittle fetch+router+React combo:

- `lib/api.ts`: a `402` becomes a typed `BillingRequiredError extends ApiError` (carries the machine `code` parsed from `{ error }`, defaulting to `subscription_required`); before throwing it calls `notifyBillingRequired(code)`. Other failures still throw plain `ApiError`. `lib/billing/billing-redirect.ts` is the tiny `onBillingRequired`/`notifyBillingRequired` registry the API client uses to signal React without importing the router.
- `components/billing/billing-redirect.tsx`: a render-nothing client component that subscribes and `router.push("/billing")` (skips when already on `/billing`, unsubscribes on unmount). `lib/billing/banner-logic.ts`: pure `bannerState(sub, now)` → `none` / `trial_ending{daysLeft}` / `trial_expired` / `past_due` / `blocked` (softer than the server gate — warnings, not blocks; warns within `TRIAL_WARNING_DAYS`). `components/billing/billing-banner.tsx` renders it. `lib/billing/queries.ts`: `useSubscription` + `startCheckout`/`openPortal` (redirect to the Stripe-hosted URL).
- `app/billing/page.tsx`: status + plan + period end with Subscribe (Checkout) / Manage (portal). `components/billing/billing-chrome.tsx` wires the redirect listener + the connected banner into the app shell via `providers.tsx` (banner query skipped on `/login`, hidden on `/billing`).

Tests (jsdom + `@/` alias, reusing the existing setup): `banner-logic.test.ts` (8 — every state + boundaries with injected `now`), `api.test.ts` (5 — 402→`BillingRequiredError`+code, notify fires, default code, non-402 stays `ApiError`, success), `billing-banner.test.tsx` (5 states), `billing-redirect.test.tsx` (3 — notify→push, no push on `/billing`, unsubscribes). Frontend **85 tests** (21 new), workspace typecheck clean across 8 packages.
