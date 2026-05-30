import { and, eq } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import type { OnHandRow, RecordMovementInput } from "@vendme/contracts";
import { computeOnHand } from "./inventory.logic.js";

export interface MovementResult {
  status: "applied" | "duplicate";
}

/**
 * Appends a stock movement to the ledger (ADR-0006). Idempotent: the
 * (company_id, client_uuid) unique index means a replayed offline movement is
 * a no-op rather than a double-apply.
 */
export async function recordMovement(
  companyId: string,
  input: RecordMovementInput,
): Promise<MovementResult> {
  return withCompany(companyId, async (tx) => {
    const inserted = await tx
      .insert(tables.stockMovements)
      .values({
        companyId,
        branchId: input.branchId,
        stockItemId: input.stockItemId,
        qtyDelta: input.qtyDelta,
        reason: input.reason,
        clientUuid: input.clientUuid,
      })
      .onConflictDoNothing({
        target: [tables.stockMovements.companyId, tables.stockMovements.clientUuid],
      })
      .returning({ id: tables.stockMovements.id });
    return { status: inserted.length > 0 ? "applied" : "duplicate" };
  });
}

/**
 * Current on-hand for every stock item, projected from the ledger. At scale
 * this becomes a materialized view; for now we fold the deltas through the
 * pure {@link computeOnHand} so the projection logic has a single definition.
 */
export async function getOnHand(companyId: string): Promise<OnHandRow[]> {
  return withCompany(companyId, async (tx) => {
    const rows = await tx
      .select({
        stockItemId: tables.stockMovements.stockItemId,
        qtyDelta: tables.stockMovements.qtyDelta,
      })
      .from(tables.stockMovements)
      .where(eq(tables.stockMovements.companyId, companyId));
    const onHand = computeOnHand(rows);
    return [...onHand.entries()].map(([stockItemId, value]) => ({
      stockItemId,
      onHand: value,
    }));
  });
}

/** On-hand for a single stock item (drives low-stock checks/alerts). */
export async function getOnHandFor(
  companyId: string,
  stockItemId: string,
): Promise<string> {
  return withCompany(companyId, async (tx) => {
    const rows = await tx
      .select({
        stockItemId: tables.stockMovements.stockItemId,
        qtyDelta: tables.stockMovements.qtyDelta,
      })
      .from(tables.stockMovements)
      .where(
        and(
          eq(tables.stockMovements.companyId, companyId),
          eq(tables.stockMovements.stockItemId, stockItemId),
        ),
      );
    return computeOnHand(rows).get(stockItemId) ?? "0.0000";
  });
}
