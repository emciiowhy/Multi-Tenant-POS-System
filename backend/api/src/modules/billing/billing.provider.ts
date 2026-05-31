import Stripe from "stripe";
import { env } from "../../env.js";
import type { StripeEventLike, StripeObjectLike } from "./stripe-webhook.logic.js";

/**
 * The Stripe boundary (PRD: billing/subscription gate, issue 05). Everything that
 * actually talks to Stripe — creating Customers / Checkout / Portal sessions and
 * verifying webhook signatures — lives behind this interface, so the billing
 * service is testable with a fake (mirroring the injectable lookups elsewhere:
 * the gate's `loadSubscription`, the module seam's `isModuleEnabled`, the realtime
 * gateway's `authorizeBranch`). The pure event→state mapping stays in the reducer
 * (issue 02); this only verifies signatures and normalises Stripe's objects into
 * the reducer's minimal shape.
 */
export interface BillingProvider {
  /** Returns the Company's Stripe Customer id, creating one if needed. */
  ensureCustomer(input: { companyId: string; existingCustomerId: string | null }): Promise<string>;
  /** A subscription-mode Checkout Session URL for `planKey`. */
  createCheckoutSession(input: {
    companyId: string;
    customerId: string;
    planKey: string;
  }): Promise<{ url: string }>;
  /** A billing-portal URL where the customer can manage/cancel. */
  createPortalSession(input: { customerId: string }): Promise<{ url: string }>;
  /** Verifies the Stripe signature against the webhook secret and maps the event
   *  to the reducer's minimal shape. Throws if the signature is invalid. */
  constructEvent(rawBody: Buffer | string, signature: string): StripeEventLike;
}

export interface StripeProviderConfig {
  secretKey: string;
  webhookSecret: string;
  /** plan key → Stripe price id. */
  priceByPlan: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  portalReturnUrl: string;
}

/** Permissive view of a Stripe event object so we can read fields without fighting
 *  the SDK's giant discriminated union (and stay tolerant of API-version drift). */
type RawObject = {
  id?: string;
  customer?: string | { id?: string } | null;
  status?: string;
  current_period_end?: number | null;
  subscription?: string | { id?: string } | null;
  number?: string | null;
  amount_paid?: number | null;
  lines?: { data?: Array<{ period?: { end?: number | null } | null }> };
};

const idOf = (v: string | { id?: string } | null | undefined): string =>
  typeof v === "string" ? v : (v?.id ?? "");

/** Maps a verified Stripe event to the reducer's minimal {@link StripeObjectLike}. */
export function toStripeEventLike(event: Stripe.Event): StripeEventLike {
  const o = event.data.object as RawObject;
  const object: StripeObjectLike = {
    id: o.id,
    customer: idOf(o.customer),
    status: o.status,
    current_period_end: o.current_period_end ?? undefined,
    subscription: o.subscription === undefined ? undefined : idOf(o.subscription) || null,
    // Invoice period end lives on the line item, not the invoice top-level.
    periodEnd: o.lines?.data?.[0]?.period?.end ?? null,
    number: o.number ?? undefined,
    amountPaid: o.amount_paid ?? undefined,
  };
  return { type: event.type, data: { object } };
}

export class StripeBillingProvider implements BillingProvider {
  private readonly stripe: Stripe;

  constructor(private readonly cfg: StripeProviderConfig) {
    this.stripe = new Stripe(cfg.secretKey);
  }

  async ensureCustomer(input: {
    companyId: string;
    existingCustomerId: string | null;
  }): Promise<string> {
    if (input.existingCustomerId) return input.existingCustomerId;
    const customer = await this.stripe.customers.create({
      // companyId is the tenancy + billing boundary (ADR-0001) — stamp it so the
      // customer is traceable back to the Company in the Stripe dashboard.
      metadata: { companyId: input.companyId },
    });
    return customer.id;
  }

  async createCheckoutSession(input: {
    companyId: string;
    customerId: string;
    planKey: string;
  }): Promise<{ url: string }> {
    const price = this.cfg.priceByPlan[input.planKey];
    if (!price) throw new Error(`No Stripe price configured for plan "${input.planKey}"`);
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: this.cfg.successUrl,
      cancel_url: this.cfg.cancelUrl,
      subscription_data: { metadata: { companyId: input.companyId } },
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { url: session.url };
  }

  async createPortalSession(input: { customerId: string }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: this.cfg.portalReturnUrl,
    });
    return { url: session.url };
  }

  constructEvent(rawBody: Buffer | string, signature: string): StripeEventLike {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.cfg.webhookSecret);
    return toStripeEventLike(event);
  }
}

let cached: BillingProvider | null = null;

/** The real Stripe provider, built lazily from env. Throws a clear error if
 *  billing isn't configured — so unconfigured environments fail loudly only when
 *  a billing route is actually used, never at boot or in tests (which inject a fake). */
export function getDefaultProvider(): BillingProvider {
  if (cached) return cached;
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      "Billing is not configured: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
    );
  }
  const base = env.WEB_ORIGIN.replace(/\/$/, "");
  cached = new StripeBillingProvider({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    priceByPlan: { standard: env.STRIPE_PRICE_STANDARD ?? "" },
    successUrl: env.BILLING_SUCCESS_URL ?? `${base}/billing?status=success`,
    cancelUrl: env.BILLING_CANCEL_URL ?? `${base}/billing?status=canceled`,
    portalReturnUrl: env.BILLING_PORTAL_RETURN_URL ?? `${base}/billing`,
  });
  return cached;
}
