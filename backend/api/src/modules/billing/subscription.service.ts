import { eq } from "drizzle-orm";
import { db, tables, withCompany } from "@vendme/db";
import {
  TRIAL_DAYS,
  type SubscriptionLike,
  type SubscriptionStatus,
} from "./entitlement.logic.js";

/**
 * Subscription persistence (PRD: billing/subscription gate). The gate (issue 03)
 * reads through {@link loadSubscription}; company creation and the backfill
 * (issue 04) write trials through {@link ensureTrialSubscription}. The pure
 * decision lives in entitlement.logic; this module only does the I/O.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The single v1 plan. Real plans/pricing arrive with the Stripe wiring (issue 05). */
const DEFAULT_PLAN = { key: "standard", name: "Standard", priceMonthly: "0.00" };

/**
 * The gate's default subscription lookup: a Company's subscription, RLS-scoped
 * to that company (ADR-0002), or `null` if it has none. Injected into the
 * middleware so tests need no database.
 */
export async function loadSubscription(companyId: string): Promise<SubscriptionLike | null> {
  return withCompany(companyId, async (tx) => {
    const [row] = await tx
      .select({
        status: tables.subscriptions.status,
        currentPeriodEnd: tables.subscriptions.currentPeriodEnd,
      })
      .from(tables.subscriptions)
      .where(eq(tables.subscriptions.companyId, companyId))
      .limit(1);
    if (!row) return null;
    return {
      status: row.status as SubscriptionStatus,
      currentPeriodEnd: row.currentPeriodEnd,
    };
  });
}

/** Ensures the default plan exists in the global catalogue (idempotent); returns its id. */
export async function ensureDefaultPlan(): Promise<string> {
  await db
    .insert(tables.plans)
    .values(DEFAULT_PLAN)
    .onConflictDoNothing({ target: tables.plans.key });
  const [plan] = await db
    .select({ id: tables.plans.id })
    .from(tables.plans)
    .where(eq(tables.plans.key, DEFAULT_PLAN.key))
    .limit(1);
  return plan!.id;
}

/**
 * Gives a Company a `trialing` subscription (default plan, ending in TRIAL_DAYS)
 * if it has none. Idempotent — re-running is a no-op. Used both by company
 * creation and by the backfill for Companies that predate billing. Returns
 * whether a subscription was created.
 */
export async function ensureTrialSubscription(companyId: string): Promise<boolean> {
  const planId = await ensureDefaultPlan();
  return withCompany(companyId, async (tx) => {
    const [existing] = await tx
      .select({ id: tables.subscriptions.id })
      .from(tables.subscriptions)
      .where(eq(tables.subscriptions.companyId, companyId))
      .limit(1);
    if (existing) return false;
    await tx.insert(tables.subscriptions).values({
      companyId,
      planId,
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * DAY_MS),
    });
    return true;
  });
}

/**
 * Backfill: every Company lacking a subscription gets a trialing one, so turning
 * the gate on (issue 03) doesn't lock out Companies created before billing.
 * Returns how many were created.
 */
export async function backfillTrialSubscriptions(): Promise<number> {
  const companies = await db.select({ id: tables.companies.id }).from(tables.companies);
  let created = 0;
  for (const c of companies) {
    if (await ensureTrialSubscription(c.id)) created += 1;
  }
  return created;
}
