import { and, eq, inArray } from "drizzle-orm";
import { db, tables, withCompany } from "@vendme/db";
import type { CompanyTx } from "@vendme/db";
import { can, type Permission } from "@vendme/auth";
import type { PosEvent, PosEventResult } from "@vendme/contracts";
import { deriveUuid } from "../../lib/uuid.js";
import { sumScaled } from "../../lib/decimal.js";
import { computeOrderTotals, type PricedLine } from "./pos.logic.js";
import { expandRecipe } from "../inventory/inventory.logic.js";
import { postRefund, postSale } from "../accounting/accounting.service.js";

/** Maps each POS event to the permission required to apply it (per-event RBAC). */
const EVENT_PERMISSION: Record<PosEvent["type"], Permission> = {
  "order.open": "pos:order:create",
  "order.fire": "pos:order:fire",
  "order.settle": "pos:order:settle",
  "order.refund": "pos:order:refund",
};

async function findOrder(tx: CompanyTx, companyId: string, orderClientUuid: string) {
  const [order] = await tx
    .select()
    .from(tables.orders)
    .where(
      and(
        eq(tables.orders.companyId, companyId),
        eq(tables.orders.clientUuid, orderClientUuid),
      ),
    )
    .limit(1);
  return order;
}

async function applyOpen(
  tx: CompanyTx,
  companyId: string,
  e: Extract<PosEvent, { type: "order.open" }>,
): Promise<PosEventResult> {
  const inserted = await tx
    .insert(tables.orders)
    .values({
      companyId,
      clientUuid: e.orderClientUuid,
      branchId: e.branchId,
      registerId: e.registerId ?? null,
      tableId: e.tableId ?? null,
      status: "open",
    })
    .onConflictDoNothing({ target: [tables.orders.companyId, tables.orders.clientUuid] })
    .returning({ id: tables.orders.id });

  if (inserted.length > 0) {
    return { clientUuid: e.clientUuid, status: "applied", orderId: inserted[0]!.id };
  }
  const existing = await findOrder(tx, companyId, e.orderClientUuid);
  return { clientUuid: e.clientUuid, status: "duplicate", orderId: existing?.id };
}

async function applyFire(
  tx: CompanyTx,
  companyId: string,
  enabledRestaurant: boolean,
  e: Extract<PosEvent, { type: "order.fire" }>,
): Promise<PosEventResult> {
  const order = await findOrder(tx, companyId, e.orderClientUuid);
  if (!order) return { clientUuid: e.clientUuid, status: "rejected", reason: "unknown order" };
  // State-transition idempotency: a fired/settled order ignores replayed fires.
  if (order.status !== "open") {
    return { clientUuid: e.clientUuid, status: "duplicate", orderId: order.id };
  }

  const productIds = [...new Set(e.lines.map((l) => l.productId))];
  const products = productIds.length
    ? await tx
        .select({
          id: tables.products.id,
          price: tables.products.price,
          taxId: tables.products.taxId,
        })
        .from(tables.products)
        .where(inArray(tables.products.id, productIds))
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const variantIds = e.lines.map((l) => l.variantId).filter((v): v is string => Boolean(v));
  const variants = variantIds.length
    ? await tx
        .select({ id: tables.productVariants.id, priceDelta: tables.productVariants.priceDelta })
        .from(tables.productVariants)
        .where(inArray(tables.productVariants.id, variantIds))
    : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const taxIds = products.map((p) => p.taxId).filter((t): t is string => Boolean(t));
  const taxes = taxIds.length
    ? await tx
        .select({ id: tables.taxes.id, rate: tables.taxes.rate })
        .from(tables.taxes)
        .where(inArray(tables.taxes.id, taxIds))
    : [];
  const taxById = new Map(taxes.map((t) => [t.id, t]));

  const recipeRows = productIds.length
    ? await tx
        .select({
          productId: tables.recipes.productId,
          stockItemId: tables.recipes.stockItemId,
          quantity: tables.recipes.quantity,
        })
        .from(tables.recipes)
        .where(inArray(tables.recipes.productId, productIds))
    : [];
  const recipesByProduct = new Map<string, { stockItemId: string; quantity: string }[]>();
  for (const r of recipeRows) {
    const list = recipesByProduct.get(r.productId) ?? [];
    list.push({ stockItemId: r.stockItemId, quantity: r.quantity });
    recipesByProduct.set(r.productId, list);
  }

  // Resolve authoritative prices server-side (never trust client prices).
  const priced: PricedLine[] = e.lines.map((l) => {
    const product = productById.get(l.productId);
    if (!product) throw new Error(`unknown product ${l.productId}`);
    const variant = l.variantId ? variantById.get(l.variantId) : undefined;
    const unitPrice = sumScaled([product.price, variant?.priceDelta ?? "0"]);
    const taxRate = product.taxId ? (taxById.get(product.taxId)?.rate ?? "0") : "0";
    return { unitPrice, quantity: l.quantity, taxRate };
  });
  const totals = computeOrderTotals(priced);

  // Persist order lines.
  await tx.insert(tables.orderLines).values(
    e.lines.map((l, i) => ({
      companyId,
      orderId: order.id,
      productId: l.productId,
      variantId: l.variantId ?? null,
      quantity: l.quantity,
      unitPrice: totals.lines[i]!.unitPrice,
      lineTotal: totals.lines[i]!.lineTotal,
      modifiers: l.modifiers ?? null,
    })),
  );

  // Expand recipes → negative stock movements (ADR-0006). Deterministic
  // child uuids keep replay idempotent even though one fire emits N movements.
  const movements: {
    companyId: string;
    branchId: string;
    stockItemId: string;
    qtyDelta: string;
    reason: string;
    orderId: string;
    clientUuid: string;
  }[] = [];
  e.lines.forEach((l, i) => {
    const components = recipesByProduct.get(l.productId) ?? [];
    for (const m of expandRecipe(components, l.quantity)) {
      movements.push({
        companyId,
        branchId: order.branchId,
        stockItemId: m.stockItemId,
        qtyDelta: m.qtyDelta,
        reason: "fire",
        orderId: order.id,
        clientUuid: deriveUuid(e.clientUuid, `stock:${i}:${m.stockItemId}`),
      });
    }
  });
  if (movements.length > 0) {
    await tx
      .insert(tables.stockMovements)
      .values(movements)
      .onConflictDoNothing({
        target: [tables.stockMovements.companyId, tables.stockMovements.clientUuid],
      });
  }

  // Restaurant: fire a kitchen ticket (guarded by the order status transition).
  if (enabledRestaurant) {
    await tx.insert(tables.kitchenTickets).values({
      companyId,
      branchId: order.branchId,
      orderId: order.id,
      status: "queued",
    });
  }

  await tx
    .update(tables.orders)
    .set({
      status: "fired",
      firedAt: new Date(),
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      updatedAt: new Date(),
    })
    .where(and(eq(tables.orders.id, order.id), eq(tables.orders.status, "open")));

  return { clientUuid: e.clientUuid, status: "applied", orderId: order.id };
}

async function applySettle(
  tx: CompanyTx,
  companyId: string,
  e: Extract<PosEvent, { type: "order.settle" }>,
): Promise<PosEventResult> {
  const order = await findOrder(tx, companyId, e.orderClientUuid);
  if (!order) return { clientUuid: e.clientUuid, status: "rejected", reason: "unknown order" };
  if (order.status === "settled") {
    return { clientUuid: e.clientUuid, status: "duplicate", orderId: order.id };
  }
  if (order.status !== "fired") {
    return { clientUuid: e.clientUuid, status: "rejected", reason: "order not fired" };
  }

  await tx.insert(tables.payments).values(
    e.tenders.map((t, i) => ({
      companyId,
      orderId: order.id,
      method: t.method,
      amount: t.amount,
      kind: "capture",
      clientUuid: deriveUuid(e.clientUuid, `tender:${i}`),
    })),
  );

  await postSale(tx, companyId, {
    id: order.id,
    grandTotal: order.grandTotal,
    taxTotal: order.taxTotal,
  });

  await tx
    .update(tables.orders)
    .set({ status: "settled", settledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tables.orders.id, order.id), eq(tables.orders.status, "fired")));

  return { clientUuid: e.clientUuid, status: "applied", orderId: order.id };
}

async function applyRefund(
  tx: CompanyTx,
  companyId: string,
  e: Extract<PosEvent, { type: "order.refund" }>,
): Promise<PosEventResult> {
  const order = await findOrder(tx, companyId, e.orderClientUuid);
  if (!order) return { clientUuid: e.clientUuid, status: "rejected", reason: "unknown order" };

  // Idempotency: the refund payment carries the event's clientUuid directly.
  const inserted = await tx
    .insert(tables.payments)
    .values({
      companyId,
      orderId: order.id,
      method: "cash",
      amount: e.amount,
      kind: "refund",
      clientUuid: e.clientUuid,
    })
    .onConflictDoNothing({
      target: [tables.payments.companyId, tables.payments.clientUuid],
    })
    .returning({ id: tables.payments.id });

  if (inserted.length === 0) {
    return { clientUuid: e.clientUuid, status: "duplicate", orderId: order.id };
  }

  await postRefund(tx, companyId, { id: order.id }, e.amount);

  await tx
    .update(tables.orders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(tables.orders.id, order.id));

  return { clientUuid: e.clientUuid, status: "applied", orderId: order.id };
}

/**
 * Processes a batch of POS events (possibly replayed from an offline terminal).
 * Each event runs in its own company-scoped transaction so partial progress
 * survives, and each is idempotent (ADR-0006). Per-event RBAC is enforced here.
 */
export async function processBatch(
  companyId: string,
  role: string,
  events: PosEvent[],
): Promise<PosEventResult[]> {
  const [company] = await db
    .select({ enabledModules: tables.companies.enabledModules })
    .from(tables.companies)
    .where(eq(tables.companies.id, companyId))
    .limit(1);
  const enabledRestaurant = Boolean(company?.enabledModules?.restaurant);

  const results: PosEventResult[] = [];
  for (const event of events) {
    if (!can(role, EVENT_PERMISSION[event.type])) {
      results.push({ clientUuid: event.clientUuid, status: "rejected", reason: "forbidden" });
      continue;
    }
    try {
      const result = await withCompany(companyId, async (tx) => {
        switch (event.type) {
          case "order.open":
            return applyOpen(tx, companyId, event);
          case "order.fire":
            return applyFire(tx, companyId, enabledRestaurant, event);
          case "order.settle":
            return applySettle(tx, companyId, event);
          case "order.refund":
            return applyRefund(tx, companyId, event);
        }
      });
      results.push(result);
    } catch (err) {
      results.push({
        clientUuid: event.clientUuid,
        status: "rejected",
        reason: err instanceof Error ? err.message : "error",
      });
    }
  }
  return results;
}
