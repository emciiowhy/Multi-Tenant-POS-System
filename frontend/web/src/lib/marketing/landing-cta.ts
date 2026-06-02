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
 * Where "Go to dashboard" (and the post-sign-in redirect) lands: the dashboard
 * home at `/home`. It renders inside the shell and resolves a branch context —
 * auto-forwarding to the single branch's register, or showing a branch picker —
 * so the sidebar always populates. (Previously `/billing`, the only non-branch
 * route, which is why returning users used to land on the paywall page.)
 */
export const DASHBOARD_HOME = "/home";

export function landingCta(input: { status: SessionStatus }): CtaTarget {
  if (input.status === "authenticated") {
    return { label: "Go to dashboard", href: DASHBOARD_HOME };
  }
  // unauthenticated *or* still loading → treat as a visitor (no premature jump).
  return { label: "Get Started", href: "/login" };
}
