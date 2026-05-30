import { subScaled, sumScaled } from "../../lib/decimal.js";

/**
 * Expected cash in the drawer at close: opening float plus the signed sum of
 * cash movements (cash sales and pay-ins positive, pay-outs/refunds negative).
 */
export function computeExpectedDrawer(
  openingFloat: string,
  cashMovements: string[],
): string {
  return sumScaled([openingFloat, ...cashMovements]);
}

/** counted − expected. Positive = over, negative = short. */
export function drawerVariance(counted: string, expected: string): string {
  return subScaled(counted, expected);
}
