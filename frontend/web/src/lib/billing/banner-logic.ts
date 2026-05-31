/**
 * Pure presentation logic for the billing banner (PRD: billing/subscription gate,
 * issue 06). Given the Company's locally-mirrored subscription and the current
 * time, decide what (if anything) to warn about. This is softer than the server
 * gate's `decideAccess`: the gate hard-blocks with a 402, while the banner only
 * nudges (trial ending soon, payment past due) so an otherwise-working app stays
 * usable. Kept pure so it's exhaustively testable with an injected `now`.
 */

export interface BannerSub {
  status: string;
  /** ISO timestamp from the API (subscriptions.currentPeriodEnd), or null. */
  currentPeriodEnd: string | null;
}

export type BannerState =
  | { kind: "none" }
  | { kind: "trial_ending"; daysLeft: number }
  | { kind: "trial_expired" }
  | { kind: "past_due" }
  | { kind: "blocked"; status: string };

/** Warn once a trial has this many days (or fewer) remaining. */
export const TRIAL_WARNING_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function bannerState(sub: BannerSub | null, now: Date): BannerState {
  if (!sub) return { kind: "none" };

  switch (sub.status) {
    case "active":
      return { kind: "none" };
    case "trialing": {
      const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : null;
      if (end === null || end <= now.getTime()) return { kind: "trial_expired" };
      const daysLeft = Math.ceil((end - now.getTime()) / DAY_MS);
      return daysLeft <= TRIAL_WARNING_DAYS ? { kind: "trial_ending", daysLeft } : { kind: "none" };
    }
    case "past_due":
      return { kind: "past_due" };
    default:
      // canceled / unpaid / incomplete — these Companies are redirected by the
      // gate, but surface the reason if they somehow land on a chrome'd page.
      return { kind: "blocked", status: sub.status };
  }
}
