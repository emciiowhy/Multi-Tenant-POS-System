import type { SessionStatus } from "@/lib/auth/session-view";

/**
 * Pure landing CTA resolver (UI/UX modernization, slice 08). The marketing hero's
 * primary call-to-action is session-aware: a visitor is pushed into the auth
 * onboarding flow, while a signed-in user is offered a jump into the app. Kept
 * pure (node-tested); the client `LandingCtaButton` feeds it `useAppSession().status`.
 */

export interface CtaTarget {
  label: string;
  href: string;
}

/**
 * Where "Go to dashboard" lands. There is no `/dashboard` index route — the
 * authenticated routes are branch-scoped (`/pos/:branch`, …) or `/billing`.
 * `/billing` is the one always-valid, non-branch route and it renders *inside*
 * the dashboard shell, so it reliably drops a returning user into the chrome
 * (from which the sidebar reaches everything). Single constant → trivially
 * repointed if a dedicated dashboard home lands later.
 */
export const DASHBOARD_HOME = "/billing";

export function landingCta(input: { status: SessionStatus }): CtaTarget {
  if (input.status === "authenticated") {
    return { label: "Go to dashboard", href: DASHBOARD_HOME };
  }
  // unauthenticated *or* still loading → treat as a visitor (no premature jump).
  return { label: "Get Started", href: "/login" };
}
