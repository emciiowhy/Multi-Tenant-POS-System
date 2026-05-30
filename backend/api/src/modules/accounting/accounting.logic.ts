import { subScaled, sumScaled, toScaled } from "../../lib/decimal.js";

export interface PostingLine {
  accountId: string;
  debit: string;
  credit: string;
}

export interface SaleAccounts {
  cashAccountId: string;
  revenueAccountId: string;
  taxAccountId: string;
}

/**
 * Double-entry posting for a settled sale (ADR-0006):
 *   Dr Cash        grandTotal
 *   Cr Revenue     grandTotal - tax
 *   Cr Tax Payable tax
 * Debits == credits by construction.
 */
export function buildSalePosting(
  accounts: SaleAccounts,
  grandTotal: string,
  taxTotal: string,
): PostingLine[] {
  const revenue = subScaled(grandTotal, taxTotal);
  return [
    { accountId: accounts.cashAccountId, debit: grandTotal, credit: "0" },
    { accountId: accounts.revenueAccountId, debit: "0", credit: revenue },
    { accountId: accounts.taxAccountId, debit: "0", credit: taxTotal },
  ];
}

/**
 * Reversing posting for a refund: mirrors the sale at the refunded amount.
 *   Dr Revenue  amount - taxPortion
 *   Dr Tax      taxPortion
 *   Cr Cash     amount
 */
export function buildRefundPosting(
  accounts: SaleAccounts,
  amount: string,
  taxPortion = "0",
): PostingLine[] {
  const revenuePortion = subScaled(amount, taxPortion);
  return [
    { accountId: accounts.revenueAccountId, debit: revenuePortion, credit: "0" },
    { accountId: accounts.taxAccountId, debit: taxPortion, credit: "0" },
    { accountId: accounts.cashAccountId, debit: "0", credit: amount },
  ];
}

/** Invariant every journal entry must satisfy: total debits == total credits. */
export function isBalanced(lines: PostingLine[]): boolean {
  const debits = sumScaled(lines.map((l) => l.debit));
  const credits = sumScaled(lines.map((l) => l.credit));
  return toScaled(debits) === toScaled(credits);
}
