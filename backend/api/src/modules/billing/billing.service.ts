import { eq } from "drizzle-orm";
import { tables, withCompany, withoutTenantScope } from "@vendme/db";
import { badRequest } from "../../lib/context.js";
import { reduceStripeEvent } from "./stripe-webhook.logic.js";
import { getDefaultProvider, type BillingProvider } from "./billing.provider.js";

/**
 * Billing service (PRD: billing/subscription gate, issue 05). The DB + Stripe
 * orchestration: read the local subscription for the UI, start Checkout/Portal
 * sessions, and apply verified webhooks (reduce → upsert). Stripe is reached only
 * through an injected {@link BillingProvider} (default = the real one) so this is
 * testable with a fake; the pure event→state mapping is the reducer (issue 02).
 * Stripe network calls happen OUTSIDE any DB transaction.
 */

export interface SubscriptionView {
  status: string;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  plan: { key: string; name: string; priceMonthly: string } | null;
}

/** The Company's subscription (status + plan + period end) for the billing UI. */
export async function getSubscription(companyId: string): Promise<SubscriptionView | null> {
  return withCompany(companyId, async (tx) => {
    const [row] = await tx
      .select({
        status: tables.subscriptions.status,
        currentPeriodEnd: tables.subscriptions.currentPeriodEnd,
        stripeCustomerId: tables.subscriptions.stripeCustomerId,
        planKey: tables.plans.key,
        planName: tables.plans.name,
        planPrice: tables.plans.priceMonthly,
      })
      .from(tables.subscriptions)
      .leftJoin(tables.plans, eq(tables.subscriptions.planId, tables.plans.id))
      .where(eq(tables.subscriptions.companyId, companyId))
      .limit(1);
    if (!row) return null;
    return {
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd,
      stripeCustomerId: row.stripeCustomerId,
      plan: row.planKey
        ? { key: row.planKey, name: row.planName!, priceMonthly: row.planPrice! }
        : null,
    };
  });
}

async function readCustomerId(companyId: string): Promise<string | null> {
  return withCompany(companyId, async (tx) => {
    const [row] = await tx
      .select({ stripeCustomerId: tables.subscriptions.stripeCustomerId })
      .from(tables.subscriptions)
      .where(eq(tables.subscriptions.companyId, companyId))
      .limit(1);
    return row?.stripeCustomerId ?? null;
  });
}

/** Subscription-mode Checkout URL; ensures a Stripe Customer and persists its id. */
export async function createCheckoutSession(
  companyId: string,
  planKey = "standard",
  provider: BillingProvider = getDefaultProvider(),
): Promise<{ url: string }> {
  const existing = await readCustomerId(companyId);
  const customerId = await provider.ensureCustomer({ companyId, existingCustomerId: existing });
  if (customerId !== existing) {
    await withCompany(companyId, (tx) =>
      tx
        .update(tables.subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(tables.subscriptions.companyId, companyId)),
    );
  }
  return provider.createCheckoutSession({ companyId, customerId, planKey });
}

/** Stripe billing-portal URL for managing/cancelling the subscription. */
export async function createPortalSession(
  companyId: string,
  provider: BillingProvider = getDefaultProvider(),
): Promise<{ url: string }> {
  const customerId = await readCustomerId(companyId);
  if (!customerId) throw badRequest("No Stripe customer yet — subscribe before opening the portal");
  return provider.createPortalSession({ customerId });
}

/**
 * Verifies a Stripe webhook, reduces it to a subscription change (issue 02), and
 * upserts the local mirror idempotently. The event identifies the Company only by
 * its Stripe customer id, so the lookup/upsert runs on the audited cross-company
 * platform path (ADR-0001) — never with a tenant GUC. Invoice events also record
 * a local `invoices` row (best-effort, de-duped by the company+number unique key).
 */
export async function applyWebhook(
  rawBody: Buffer | string,
  signature: string,
  provider: BillingProvider = getDefaultProvider(),
): Promise<{ applied: boolean }> {
  let event;
  try {
    event = provider.constructEvent(rawBody, signature);
  } catch {
    throw badRequest("Invalid Stripe signature");
  }

  const change = reduceStripeEvent(event);
  if (!change || !change.stripeCustomerId) return { applied: false };
  const stripeCustomerId = change.stripeCustomerId;
  const obj = event.data.object;
  const isPaidInvoice = event.type === "invoice.paid" || event.type === "invoice.payment_succeeded";

  const applied = await withoutTenantScope(async (tx) => {
    const [row] = await tx
      .select({ companyId: tables.subscriptions.companyId })
      .from(tables.subscriptions)
      .where(eq(tables.subscriptions.stripeCustomerId, stripeCustomerId))
      .limit(1);
    if (!row) return false; // event for a customer we don't know about yet

    await tx
      .update(tables.subscriptions)
      .set({
        status: change.status,
        ...(change.currentPeriodEnd !== undefined ? { currentPeriodEnd: change.currentPeriodEnd } : {}),
        ...(change.stripeSubscriptionId ? { stripeSubscriptionId: change.stripeSubscriptionId } : {}),
      })
      .where(eq(tables.subscriptions.companyId, row.companyId));

    if (obj.number && obj.amountPaid != null) {
      await tx
        .insert(tables.invoices)
        .values({
          companyId: row.companyId,
          number: obj.number,
          amount: (obj.amountPaid / 100).toFixed(2),
          status: isPaidInvoice ? "paid" : "open",
          issuedAt: new Date(),
        })
        .onConflictDoNothing();
    }
    return true;
  });

  return { applied };
}
