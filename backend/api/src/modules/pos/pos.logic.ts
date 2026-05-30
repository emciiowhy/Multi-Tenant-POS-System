import { mulScaled, sumScaled } from "../../lib/decimal.js";

export interface PricedLine {
  unitPrice: string;
  quantity: string;
  taxRate: string;
}

export interface ComputedLine extends PricedLine {
  lineTotal: string;
  lineTax: string;
}

export interface OrderTotals {
  lines: ComputedLine[];
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
}

/**
 * Computes order totals from server-resolved prices (never trust client prices)
 * and per-line tax rates. All arithmetic is fixed-point (ADR-0006 integrity).
 */
export function computeOrderTotals(lines: PricedLine[]): OrderTotals {
  const computed: ComputedLine[] = lines.map((l) => {
    const lineTotal = mulScaled(l.unitPrice, l.quantity);
    const lineTax = mulScaled(lineTotal, l.taxRate);
    return { ...l, lineTotal, lineTax };
  });
  const subtotal = sumScaled(computed.map((l) => l.lineTotal));
  const taxTotal = sumScaled(computed.map((l) => l.lineTax));
  const grandTotal = sumScaled([subtotal, taxTotal]);
  return { lines: computed, subtotal, taxTotal, grandTotal };
}
