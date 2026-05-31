import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import type { BillingProvider } from "./modules/billing/billing.provider.js";
import type { StripeEventLike } from "./modules/billing/stripe-webhook.logic.js";

/**
 * Headless "for real" verification of the Restaurant backend. Boots an
 * in-process Postgres (PGlite), exposes it over the PG wire protocol so the
 * app's normal pg.Pool connects to it unchanged, applies the real schema + RLS,
 * runs the real seed, then exercises the actual floor/KDS service functions and
 * asserts the realtime bus emits the precise deltas.
 *
 * Caveat: PGlite connects as a superuser, so RLS policies are installed and
 * valid but not *enforced* (superusers bypass RLS) — tenant isolation is
 * covered separately by packages/db rls.test.ts. Everything else here is the
 * genuine runtime path against real Postgres.
 */

const PORT = 54329;
const DB_URL = `postgresql://postgres@127.0.0.1:${PORT}/postgres`;

// Point the app's db client at the in-process Postgres BEFORE importing @vendme/db.
process.env.DATABASE_URL = DB_URL;
process.env.DATABASE_URL_UNPOOLED = DB_URL;
process.env.DB_POOL_MAX = "1";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(here, "..", "..", "..", "packages", "db", "drizzle", "0000_init.sql");

let passed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${msg}`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("→ booting in-process Postgres (PGlite)…");
  const pglite = await PGlite.create();

  // eslint-disable-next-line no-console
  console.log("→ applying schema + RLS…");
  const schemaSql = readFileSync(MIGRATION, "utf8").replaceAll("--> statement-breakpoint", "");
  await pglite.exec(schemaSql);
  const { buildRlsStatements } = await import("@vendme/db");
  await pglite.exec(buildRlsStatements().join("\n"));

  // eslint-disable-next-line no-console
  console.log(`→ serving PGlite over the PG wire protocol on :${PORT}…`);
  const server = new PGLiteSocketServer({ db: pglite, port: PORT, host: "127.0.0.1", maxConnections: 5 });
  await server.start();

  try {
    // eslint-disable-next-line no-console
    console.log("→ seeding demo data via real code paths…\n");
    const { seedDemo } = await import("./seed.js");
    const { companyId, branchId } = await seedDemo();

    const { getFloorPlan, transitionTable } = await import("./modules/restaurant/table.service.js");
    const { listTickets, transitionTicket } = await import("./modules/restaurant/kds.service.js");
    const { realtimeBus } = await import("./realtime/bus.js");

    // eslint-disable-next-line no-console
    console.log("\n[1] reads return the seeded data");
    const plan = await getFloorPlan(companyId, branchId);
    assert(plan.sections.length === 2, `floor plan has 2 sections (got ${plan.sections.length})`);
    assert(plan.tables.length === 6, `floor plan has 6 tables (got ${plan.tables.length})`);
    const tickets = await listTickets(companyId, branchId);
    assert(tickets.length >= 1, `KDS board has active tickets (got ${tickets.length})`);

    // eslint-disable-next-line no-console
    console.log("\n[2] writes emit precise realtime deltas on the bus");
    const captured: string[] = [];
    const unsub = realtimeBus.subscribe((m) => captured.push(m.event.type));

    const freeTable = plan.tables.find((t) => t.status === "free");
    assert(Boolean(freeTable), "a free table exists to seat");
    await transitionTable(companyId, freeTable!.id, "seated");
    assert(captured.includes("table.changed"), "table.changed emitted");

    await transitionTicket(companyId, tickets[0]!.id, "preparing");
    assert(captured.includes("kitchen.ticket.updated"), "kitchen.ticket.updated emitted");
    unsub();

    // eslint-disable-next-line no-console
    console.log("\n[3] writes persisted (read-after-write reflects them)");
    const planAfter = await getFloorPlan(companyId, branchId);
    assert(
      planAfter.tables.find((t) => t.id === freeTable!.id)?.status === "seated",
      "seated table persisted",
    );
    const ticketsAfter = await listTickets(companyId, branchId);
    assert(
      ticketsAfter.find((t) => t.id === tickets[0]!.id)?.status === "preparing",
      "ticket advanced to 'preparing' and stayed on the board",
    );

    // eslint-disable-next-line no-console
    console.log("\n[4] billing: the seeded company is on a trial the gate allows");
    const { loadSubscription, ensureTrialSubscription } = await import(
      "./modules/billing/subscription.service.js"
    );
    const { decideAccess } = await import("./modules/billing/entitlement.logic.js");
    const sub = await loadSubscription(companyId);
    assert(sub?.status === "trialing", `demo company is on a trialing subscription (got ${sub?.status})`);
    assert(decideAccess(sub, new Date()).allowed, "gate ALLOWS the in-trial demo company");
    const createdAgain = await ensureTrialSubscription(companyId);
    assert(createdAgain === false, "ensureTrialSubscription is idempotent (no duplicate trial)");

    // Manually expire the trial → the same policy now blocks the company.
    const { withCompany, tables } = await import("@vendme/db");
    const { eq } = await import("drizzle-orm");
    await withCompany(companyId, (tx) =>
      tx
        .update(tables.subscriptions)
        .set({ currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .where(eq(tables.subscriptions.companyId, companyId)),
    );
    const expired = await loadSubscription(companyId);
    assert(
      !decideAccess(expired, new Date()).allowed,
      "gate BLOCKS the demo company once its trial has expired",
    );

    // eslint-disable-next-line no-console
    console.log("\n[5] billing webhook: a verified event upserts the local mirror (idempotent)");
    const billing = await import("./modules/billing/billing.service.js");
    const CUSTOMER = "cus_demo_1";
    // Fake provider (the injected Stripe boundary): no network, returns a canned event.
    const fakeProvider = (event?: StripeEventLike): BillingProvider => ({
      ensureCustomer: async () => CUSTOMER,
      createCheckoutSession: async () => ({ url: "https://stripe.test/checkout" }),
      createPortalSession: async () => ({ url: "https://stripe.test/portal" }),
      constructEvent: () => event ?? { type: "ignored", data: { object: { customer: CUSTOMER } } },
    });

    // Checkout links a Stripe Customer to the Company (persists stripeCustomerId).
    await billing.createCheckoutSession(companyId, "standard", fakeProvider());
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const activeEvent: StripeEventLike = {
      type: "customer.subscription.updated",
      data: { object: { id: "sub_demo", customer: CUSTOMER, status: "active", current_period_end: periodEnd } },
    };
    await billing.applyWebhook("{}", "sig", fakeProvider(activeEvent));
    const afterActive = await billing.getSubscription(companyId);
    assert(afterActive?.status === "active", `webhook flipped the subscription to active (got ${afterActive?.status})`);
    assert(afterActive?.plan?.key === "standard", "subscription view carries the plan");

    await billing.applyWebhook("{}", "sig", fakeProvider(activeEvent));
    const afterReplay = await billing.getSubscription(companyId);
    assert(afterReplay?.status === "active", "re-delivering the same event is idempotent (still active)");

    const cancelEvent: StripeEventLike = {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_demo", customer: CUSTOMER } },
    };
    await billing.applyWebhook("{}", "sig", fakeProvider(cancelEvent));
    const afterCancel = await billing.getSubscription(companyId);
    assert(afterCancel?.status === "canceled", "a deletion webhook cancels the local subscription");

    // eslint-disable-next-line no-console
    console.log(`\n✓ ALL ${passed} CHECKS PASSED — backend ran for real against Postgres (PGlite).`);
  } finally {
    await server.stop();
    await pglite.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("\n✗ VERIFY FAILED:", err);
    process.exit(1);
  });
