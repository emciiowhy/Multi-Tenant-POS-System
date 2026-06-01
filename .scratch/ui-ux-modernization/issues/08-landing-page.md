# Modern SaaS landing page

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

A premium, conversion-focused landing page at `/` (PRD spec 1), replacing the
auth stub. Stays a server component using `auth()`.

- Sections: **Hero** (offline-resilient, multi-tenant POS; primary CTA "Get
  Started" → `/login`), **Feature grid** (interactive cards: offline mode →
  ADR-0013; real-time sync → ADR-0014; multi-branch/multi-tenant → ADR-0001),
  **Pricing matrix** (Free Trial = `TRIAL_DAYS`; **Standard** = the real plan,
  price from a single configurable display constant, CTA → sign-in → in-app
  Subscribe; Enterprise/Contact), and a closing CTA band. Lightweight top nav +
  footer.
- Signed-in visitors see "Go to dashboard" instead of "Get Started".
- Built on slice 02/03 primitives + slice 01 tokens; tasteful hover/scale via
  motion tokens, no animation libraries.

## Acceptance criteria

- [x] `/` renders hero, feature grid, pricing matrix, and CTA; "Get Started" links to `/login`.
- [x] Signed-in users see a "Go to dashboard" CTA (session-aware).
- [x] Pricing shows the trial + Standard plan with a configurable display price; the Standard CTA routes into the auth/Subscribe flow (no Stripe call from marketing).
- [x] Landing section components have render tests (hero copy, feature cards, pricing tiers, CTA href).
- [x] Responsive and dark-mode correct; no layout overflow on mobile. *(responsive grids + token colors that flip with the theme; `min-w-0`/wrapping CTAs. The deeper visual gate is `next dev`.)*

## Blocked by

- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`

## Done (red-green) — `66215ad`

- **Pure cores (node-tested).** `lib/marketing/landing-cta.ts` — `landingCta({status})`
  → "Get Started" → `/login` for a visitor / still-loading session, "Go to
  dashboard" → `DASHBOARD_HOME` when authenticated. `lib/marketing/pricing.ts` —
  three tiers (Free Trial / **Standard** featured / Enterprise), `TRIAL_DAYS` (=14,
  mirrors the backend entitlement constant) + a configurable
  `STANDARD_PRICE_DISPLAY`; trial + standard CTAs → `/login` (never Stripe).
- **Sections** under `components/marketing/`: `LandingCtaButton` (the session-aware
  CTA — `useAppSession().status` → `landingCta`, styled with the `buttonClasses`
  resolver on a `Link`), `LandingHero`, `FeatureGrid` (POS, Shift Management,
  Returns, real-time sync, multi-branch + upcoming **Restaurant**; reuses
  `Card`/`Badge`), `PricingMatrix` (renders the pure tiers). `app/page.tsx` composes
  a sticky nav + hero + features + pricing + closing band + footer — **outside the
  `(dashboard)` group**, so it carries no shell chrome (test asserts no sidebar).
- **Token adherence:** built entirely on slice-01 tokens (`bg-surface`/`text-fg`/
  `bg-brand`/`border-border`, status `Badge`s) — a test asserts those utilities are
  present and that the rendered markup ships **zero hardcoded hex** colors.

### ⚠️ Divergence from this ticket (intentional, per live instruction)
The ticket said the page "**stays a server component using `auth()`**." Per the
resume instruction, the CTA is instead driven by the **client `useAppSession`
bridge** (slice 06) so it's mockable and behaviorally tested; `app/page.tsx` no
longer imports `@/auth`. SSR still renders the marketing HTML; the CTA hydrates to
the correct label. The `SessionProvider` already wraps the whole app (root
`Providers`, slice 06), so `useAppSession` resolves on `/`.

### Note: "Go to dashboard" target
No `/dashboard` index route exists (authenticated routes are branch-scoped or
`/billing`). `DASHBOARD_HOME = "/billing"` — the one always-valid non-branch route,
which renders inside the dashboard shell. Single constant; repoint if a dedicated
dashboard home lands later.

Tests: landing-cta (3) + pricing (4) + landing page (4) = **11 new**. Frontend
suite **200 passing**; workspace typecheck **8/8**.
