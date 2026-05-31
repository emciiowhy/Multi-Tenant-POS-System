/**
 * The subscription gate's brain (PRD: billing/subscription gate, issue 01). A
 * pure decision over a Company's subscription — no DB, no Stripe, no I/O — so it
 * can be exhaustively unit-tested. The middleware (issue 03) loads the
 * subscription and calls this; nothing else decides entitlement.
 */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export interface SubscriptionLike {
  status: SubscriptionStatus;
  /** Trial end (for trialing) or current paid-period end (for active/past_due). */
  currentPeriodEnd: Date | null;
}

export type AccessReason =
  | "active"
  | "trialing"
  | "grace"
  | "no_subscription"
  | "trial_expired"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
}

/** Days a past_due subscription keeps access after its period end before lockout. */
export const PAST_DUE_GRACE_DAYS = 3;
/** Default free-trial length (days) — used by trial seeding (issue 04). */
export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a Company may use the product right now, and why. */
export function decideAccess(
  subscription: SubscriptionLike | null,
  now: Date,
): AccessDecision {
  if (!subscription) return { allowed: false, reason: "no_subscription" };

  const { status, currentPeriodEnd } = subscription;
  const periodEnd = currentPeriodEnd?.getTime() ?? null;

  switch (status) {
    case "active":
      return { allowed: true, reason: "active" };
    case "trialing":
      return periodEnd !== null && now.getTime() < periodEnd
        ? { allowed: true, reason: "trialing" }
        : { allowed: false, reason: "trial_expired" };
    case "past_due":
      return periodEnd !== null && now.getTime() < periodEnd + PAST_DUE_GRACE_DAYS * DAY_MS
        ? { allowed: true, reason: "grace" }
        : { allowed: false, reason: "past_due" };
    case "canceled":
      return { allowed: false, reason: "canceled" };
    case "unpaid":
      return { allowed: false, reason: "unpaid" };
    case "incomplete":
      return { allowed: false, reason: "incomplete" };
  }
}
