import type { TableStatus } from "@vendme/contracts";

/**
 * Floor/table lifecycle. A table is seated, takes an order, asks for the bill,
 * then is cleared back to free. Any occupied table may also be cleared straight
 * to free (walkout, manual reset). Staying in place and moving backward are
 * rejected.
 */
const ALLOWED: Record<TableStatus, readonly TableStatus[]> = {
  free: ["seated"],
  seated: ["ordered", "free"],
  ordered: ["bill", "free"],
  bill: ["free"],
};

export function isValidTableTransition(from: TableStatus, to: TableStatus): boolean {
  return ALLOWED[from].includes(to);
}
