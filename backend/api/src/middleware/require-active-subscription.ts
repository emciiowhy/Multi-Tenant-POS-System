import type { RequestHandler } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { paymentRequired, unauthorized } from "../lib/context.js";
import {
  decideAccess,
  type AccessReason,
  type SubscriptionLike,
} from "../modules/billing/entitlement.logic.js";
import { loadSubscription } from "../modules/billing/subscription.service.js";

/** How a Company's subscription is fetched. Injected so tests need no database. */
export type SubscriptionLookup = (companyId: string) => Promise<SubscriptionLike | null>;

/** Block reason → the machine code returned to the client (drives the billing UI). */
function blockCode(reason: AccessReason): string {
  return reason === "no_subscription" ? "subscription_required" : reason;
}

/**
 * QA-ONLY escape hatch for local UI testing. When `QA_BYPASS_BILLING=true`, the
 * subscription gate is skipped so the dashboard can be exercised without an
 * active subscription. Defaults to OFF — to restore the paywall for the capstone
 * defense, simply unset the var (or set it to anything other than "true") and
 * restart the API. Evaluated once at boot, so the loud warning below fires
 * exactly when the bypass is live.
 */
const BILLING_BYPASS = process.env.QA_BYPASS_BILLING === "true";

if (BILLING_BYPASS) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  QA_BYPASS_BILLING=true — the Stripe subscription paywall is DISABLED. " +
      "This is for local QA only. Unset QA_BYPASS_BILLING before the capstone defense.",
  );
}

/**
 * The v1 SaaS subscription gate (ADR-0005). Runs after {@link authenticate}, so
 * the Company is resolved from `req.ctx`; loads that Company's subscription and
 * applies {@link decideAccess}. A blocked Company gets **402 Payment Required**
 * carrying a machine-readable code (`subscription_required` / `trial_expired` /
 * `past_due` / …) so the frontend can route to billing. Mounted only on the
 * tenant API — `/v1/auth`, `/v1/companies` and `/v1/billing` stay open so a
 * lapsed Company can still sign in, switch companies, and pay.
 *
 * The lookup and clock are injectable (mirroring the module seam's
 * `isModuleEnabled` and the realtime gateway's `authorizeBranch`).
 */
export function requireActiveSubscription(
  lookup: SubscriptionLookup = loadSubscription,
  now: () => Date = () => new Date(),
): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    if (BILLING_BYPASS) return next();
    if (!req.ctx) throw unauthorized();
    const subscription = await lookup(req.ctx.companyId);
    const decision = decideAccess(subscription, now());
    if (!decision.allowed) throw paymentRequired(blockCode(decision.reason));
    next();
  });
}
