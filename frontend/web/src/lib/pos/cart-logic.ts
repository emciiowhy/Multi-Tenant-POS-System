/**
 * Pure cart math for display only. Authoritative pricing/totals are computed
 * server-side at fire (backend computeOrderTotals); this just shows the cashier
 * a running subtotal. Uses scaled-integer (×10000) arithmetic to avoid float
 * drift on money, mirroring the backend's fixed-point approach (ADR-0006).
 */
export interface CartItem {
  productId: string;
  name: string;
  /** Money string, e.g. "9.50". */
  unitPrice: string;
  quantity: number;
}

const SCALE = 10000n;

function toScaled(money: string): bigint {
  const negative = money.trim().startsWith("-");
  const [whole, frac = ""] = money.trim().replace("-", "").split(".");
  const fracPadded = (frac + "0000").slice(0, 4);
  const scaled = BigInt(whole || "0") * SCALE + BigInt(fracPadded || "0");
  return negative ? -scaled : scaled;
}

function fromScaled(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Display subtotal across the cart. */
export function cartSubtotal(items: CartItem[]): string {
  const total = items.reduce(
    (acc, i) => acc + toScaled(i.unitPrice) * BigInt(i.quantity),
    0n,
  );
  return fromScaled(total);
}

/** Total number of units in the cart. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Value-equality for money strings, ignoring trailing-zero formatting
 * ("23.00" === "23.0000"). Used to flag a tendered-vs-server total mismatch. */
export function moneyEquals(a: string, b: string): boolean {
  return toScaled(a) === toScaled(b);
}
