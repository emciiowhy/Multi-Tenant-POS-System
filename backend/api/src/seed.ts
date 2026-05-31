import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { and, eq } from "drizzle-orm";
import { db, tables, withCompany } from "@vendme/db";
import { hashPassword } from "@vendme/auth";
import type { PosEvent } from "@vendme/contracts";
import { createCompanyWithOwner } from "./modules/companies/company.service.js";
import { processBatch } from "./modules/pos/pos.service.js";

/**
 * Idempotent demo seed for the Restaurant vertical (Phase 7). Builds a complete,
 * inspectable tenant so the interactive floor plan and KDS have real data:
 *
 *   - an Account + a restaurant Company (via the real bootstrap path, so roles,
 *     permissions, chart of accounts and enabledModules.restaurant are all set);
 *   - a Branch + Register;
 *   - two floor sections with tables placed on the canvas in mixed states;
 *   - menu items with recipes and starting stock;
 *   - a couple of fired orders (via processBatch — the real POS path), which
 *     produce queued KDS tickets and stock movements.
 *
 * Running twice is a no-op: it detects the demo account and returns its ids.
 */

const DEMO = {
  email: "owner@demo.vendme.dev",
  password: "demo-password-123",
  companyName: "Demo Diner",
  slug: "demo-diner",
};

export interface SeedResult {
  companyId: string;
  branchId: string;
}

async function findExisting(accountId: string): Promise<SeedResult | null> {
  const [membership] = await db
    .select({ companyId: tables.memberships.companyId })
    .from(tables.memberships)
    .where(eq(tables.memberships.accountId, accountId))
    .limit(1);
  if (!membership) return null;
  const branchId = await withCompany(membership.companyId, async (tx) => {
    const [branch] = await tx
      .select({ id: tables.branches.id })
      .from(tables.branches)
      .where(eq(tables.branches.companyId, membership.companyId))
      .limit(1);
    return branch?.id ?? null;
  });
  return branchId ? { companyId: membership.companyId, branchId } : null;
}

/**
 * Demo convenience: promote the demo owner to super_admin so a single login can
 * open every screen. In production you'd sign in as a waiter
 * (restaurant:table:manage) for the floor and kitchen staff
 * (restaurant:kds:operate) for the KDS — no single business role holds both.
 * Idempotent, so re-running also patches an already-seeded database.
 */
async function ensureDemoAccess(companyId: string, accountId: string): Promise<void> {
  await withCompany(companyId, async (tx) => {
    const [role] = await tx
      .select({ id: tables.roles.id })
      .from(tables.roles)
      .where(and(eq(tables.roles.companyId, companyId), eq(tables.roles.key, "super_admin")))
      .limit(1);
    if (!role) return;
    await tx
      .update(tables.memberships)
      .set({ roleId: role.id })
      .where(
        and(
          eq(tables.memberships.companyId, companyId),
          eq(tables.memberships.accountId, accountId),
        ),
      );
  });
}

function printAccess(branchId: string): void {
  // eslint-disable-next-line no-console
  console.log(`
✓ Demo ready.
  Login:  ${DEMO.email} / ${DEMO.password}
  Floor:  http://localhost:3000/restaurant/floor/${branchId}
  KDS:    http://localhost:3000/restaurant/kds/${branchId}
`);
}

export async function seedDemo(): Promise<SeedResult> {
  const [existing] = await db
    .select({ id: tables.accounts.id })
    .from(tables.accounts)
    .where(eq(tables.accounts.email, DEMO.email))
    .limit(1);
  if (existing) {
    const found = await findExisting(existing.id);
    // eslint-disable-next-line no-console
    console.log("→ demo account already exists; skipping reseed.");
    if (!found) throw new Error("demo account exists but has no company/branch");
    await ensureDemoAccess(found.companyId, existing.id);
    printAccess(found.branchId);
    return found;
  }

  // 1. Account + restaurant company (real bootstrap path).
  const passwordHash = await hashPassword(DEMO.password);
  const [account] = await db
    .insert(tables.accounts)
    .values({
      email: DEMO.email,
      passwordHash,
      displayName: "Demo Owner",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: tables.accounts.id });

  const company = await createCompanyWithOwner({
    name: DEMO.companyName,
    slug: DEMO.slug,
    industry: "restaurant",
    ownerAccountId: account!.id,
  });
  const companyId = company.id;
  await ensureDemoAccess(companyId, account!.id);

  // 2. Branch-scoped data: tables, menu, stock, recipes (all under RLS).
  const seeded = await withCompany(companyId, async (tx) => {
    const [branch] = await tx
      .insert(tables.branches)
      .values({ companyId, name: "Downtown", timezone: "UTC" })
      .returning({ id: tables.branches.id });
    const branchId = branch!.id;

    const [register] = await tx
      .insert(tables.registers)
      .values({ companyId, branchId, name: "Front Register" })
      .returning({ id: tables.registers.id });

    const [patio, mainHall] = await tx
      .insert(tables.floorSections)
      .values([
        { companyId, branchId, name: "Patio" },
        { companyId, branchId, name: "Main Hall" },
      ])
      .returning({ id: tables.floorSections.id });

    await tx.insert(tables.tables).values([
      { companyId, branchId, sectionId: patio!.id, label: "P1", seats: 2, status: "free", posX: 40, posY: 40, width: 90, height: 90, shape: "circle" },
      { companyId, branchId, sectionId: patio!.id, label: "P2", seats: 4, status: "seated", posX: 170, posY: 40, width: 120, height: 90, shape: "rect" },
      { companyId, branchId, sectionId: patio!.id, label: "P3", seats: 2, status: "ordered", posX: 330, posY: 40, width: 90, height: 90, shape: "circle" },
      { companyId, branchId, sectionId: mainHall!.id, label: "M1", seats: 4, status: "free", posX: 40, posY: 40, width: 120, height: 90, shape: "rect" },
      { companyId, branchId, sectionId: mainHall!.id, label: "M2", seats: 6, status: "bill", posX: 200, posY: 40, width: 160, height: 90, shape: "rect" },
      { companyId, branchId, sectionId: mainHall!.id, label: "M3", seats: 2, status: "free", posX: 400, posY: 40, width: 90, height: 90, shape: "circle" },
    ]);

    const [bun, patty, cheese, potato, colaCan] = await tx
      .insert(tables.stockItems)
      .values([
        { companyId, name: "Brioche Bun", unit: "each" },
        { companyId, name: "Beef Patty", unit: "each" },
        { companyId, name: "Cheese Slice", unit: "each" },
        { companyId, name: "Potato (200g)", unit: "portion" },
        { companyId, name: "Cola Can", unit: "each" },
      ])
      .returning({ id: tables.stockItems.id });

    const [burger, fries, cola] = await tx
      .insert(tables.products)
      .values([
        { companyId, sku: "BURG", name: "Cheeseburger", kind: "menu_item", price: "9.50" },
        { companyId, sku: "FRY", name: "Fries", kind: "menu_item", price: "4.00" },
        { companyId, sku: "COLA", name: "Cola", kind: "good", price: "2.50" },
      ])
      .returning({ id: tables.products.id });

    await tx.insert(tables.recipes).values([
      { companyId, productId: burger!.id, stockItemId: bun!.id, quantity: "1" },
      { companyId, productId: burger!.id, stockItemId: patty!.id, quantity: "1" },
      { companyId, productId: burger!.id, stockItemId: cheese!.id, quantity: "1" },
      { companyId, productId: fries!.id, stockItemId: potato!.id, quantity: "1" },
      { companyId, productId: cola!.id, stockItemId: colaCan!.id, quantity: "1" },
    ]);

    // Starting stock so fired orders don't immediately go negative.
    await tx.insert(tables.stockMovements).values(
      [bun, patty, cheese, potato, colaCan].map((s) => ({
        companyId,
        branchId,
        stockItemId: s!.id,
        qtyDelta: "100",
        reason: "receive",
        clientUuid: randomUUID(),
      })),
    );

    return { branchId, registerId: register!.id, products: { burger: burger!.id, fries: fries!.id, cola: cola!.id } };
  });

  // 3. Fire two orders the real way (processBatch) → queued KDS tickets + stock
  //    movements. "cashier" holds pos:order:create/fire (company_owner does not).
  const orderA = randomUUID();
  const orderB = randomUUID();
  const events: PosEvent[] = [
    { type: "order.open", clientUuid: randomUUID(), orderClientUuid: orderA, branchId: seeded.branchId, registerId: seeded.registerId },
    {
      type: "order.fire",
      clientUuid: randomUUID(),
      orderClientUuid: orderA,
      lines: [
        { productId: seeded.products.burger, quantity: "2" },
        { productId: seeded.products.fries, quantity: "1" },
      ],
    },
    { type: "order.open", clientUuid: randomUUID(), orderClientUuid: orderB, branchId: seeded.branchId, registerId: seeded.registerId },
    {
      type: "order.fire",
      clientUuid: randomUUID(),
      orderClientUuid: orderB,
      lines: [
        { productId: seeded.products.burger, quantity: "1" },
        { productId: seeded.products.cola, quantity: "2" },
      ],
    },
  ];
  const results = await processBatch(companyId, "cashier", events);
  const fired = results.filter((r) => r.status === "applied").length;
  // eslint-disable-next-line no-console
  console.log(`→ seeded ${fired} applied POS events (queued kitchen tickets created)`);

  printAccess(seeded.branchId);
  return { companyId, branchId: seeded.branchId };
}

// Auto-run only when invoked directly (pnpm seed), not when imported by the
// verification harness.
const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
if (invokedDirectly) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("seed failed:", err);
      process.exit(1);
    });
}
