import { fromScaled, mulScaled, negate, toScaled } from "../../lib/decimal.js";

export interface MovementRow {
  stockItemId: string;
  qtyDelta: string;
}

/**
 * Projects current on-hand from the append-only stock ledger (ADR-0006): the
 * on-hand for each stock item is the sum of its movement deltas. Negative
 * results are legal and meaningful (offline oversell, ADR-0009).
 *
 * At scale this is a materialized view; this pure version is the source of
 * truth for correctness and for rebuilding the projection.
 */
export function computeOnHand(rows: MovementRow[]): Map<string, string> {
  const acc = new Map<string, bigint>();
  for (const r of rows) {
    acc.set(r.stockItemId, (acc.get(r.stockItemId) ?? 0n) + toScaled(r.qtyDelta));
  }
  const out = new Map<string, string>();
  for (const [k, v] of acc) out.set(k, fromScaled(v));
  return out;
}

export interface RecipeComponent {
  stockItemId: string;
  quantity: string;
}

/**
 * Expands a fired menu item into the NEGATIVE stock movements it consumes:
 * for each recipe component, delta = -(component.quantity * orderQty).
 */
export function expandRecipe(
  components: RecipeComponent[],
  orderQty: string,
): MovementRow[] {
  return components.map((c) => ({
    stockItemId: c.stockItemId,
    qtyDelta: negate(mulScaled(c.quantity, orderQty)),
  }));
}
