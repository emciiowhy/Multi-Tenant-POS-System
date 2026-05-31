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

- [ ] `/` renders hero, feature grid, pricing matrix, and CTA; "Get Started" links to `/login`.
- [ ] Signed-in users see a "Go to dashboard" CTA (session-aware).
- [ ] Pricing shows the trial + Standard plan with a configurable display price; the Standard CTA routes into the auth/Subscribe flow (no Stripe call from marketing).
- [ ] Landing section components have render tests (hero copy, feature cards, pricing tiers, CTA href).
- [ ] Responsive and dark-mode correct; no layout overflow on mobile.

## Blocked by

- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
- `.scratch/ui-ux-modernization/issues/03-form-and-surface-primitives.md`
