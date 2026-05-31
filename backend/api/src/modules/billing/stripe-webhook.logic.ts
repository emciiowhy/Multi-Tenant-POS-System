import type { SubscriptionStatus } from "./entitlement.logic";

/**
 * Pure Stripe-webhook reducer (PRD: billing/subscription gate, issue 02). Maps a
 * Stripe event to the local subscription change to persist — or `null` for
 * events we ignore. No Stripe SDK and no DB here, so it's testable with plain
 * fixtures; the webhook handler (issue 05) verifies the signature and feeds the
 * event in. Idempotent: the same event always yields the same change.
 */

/** The subset of a Stripe event object the reducer reads (permissive on purpose). */
export interface StripeObjectLike {
  id?: string;
  customer: string;
  status?: string;
  /** Subscription period end, unix seconds. */
  current_period_end?: number | null;
  /** Invoice → its subscription id. */
  subscription?: string | null;
  /** Invoice period end, unix seconds. */
  periodEnd?: number | null;
  /** Invoice number (for the local audit row; the reducer ignores it). */
  number?: string | null;
  /** Invoice amount paid, in the currency's minor unit / cents (reducer ignores). */
  amountPaid?: number | null;
}

export interface StripeEventLike {
  type: string;
  data: { object: StripeObjectLike };
}

/** Local subscription fields to upsert; only the keys the event carries are set. */
export interface SubscriptionChange {
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/** Stripe statuses we don't model (incomplete_expired, paused, …) are treated
 * as canceled — i.e. blocked. */
function mapStatus(raw: string | undefined): SubscriptionStatus {
  switch (raw) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
      return raw;
    default:
      return "canceled";
  }
}

function secondsToDate(seconds: number | null | undefined): Date | null | undefined {
  if (seconds === undefined) return undefined;
  return seconds === null ? null : new Date(seconds * 1000);
}

export function reduceStripeEvent(event: StripeEventLike): SubscriptionChange | null {
  const o = event.data.object;
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return {
        status: mapStatus(o.status),
        currentPeriodEnd: secondsToDate(o.current_period_end),
        stripeCustomerId: o.customer,
        stripeSubscriptionId: o.id,
      };
    case "customer.subscription.deleted":
      return {
        status: "canceled",
        stripeCustomerId: o.customer,
        stripeSubscriptionId: o.id,
      };
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return {
        status: "active",
        currentPeriodEnd: secondsToDate(o.periodEnd),
        stripeCustomerId: o.customer,
        stripeSubscriptionId: o.subscription ?? undefined,
      };
    case "invoice.payment_failed":
      return {
        status: "past_due",
        currentPeriodEnd: secondsToDate(o.periodEnd),
        stripeCustomerId: o.customer,
        stripeSubscriptionId: o.subscription ?? undefined,
      };
    default:
      return null;
  }
}
