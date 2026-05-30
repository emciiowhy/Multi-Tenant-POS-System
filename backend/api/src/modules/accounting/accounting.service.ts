import { and, eq, inArray } from "drizzle-orm";
import { tables } from "@vendme/db";
import type { CompanyTx } from "@vendme/db";
import { HttpError } from "../../lib/context.js";
import {
  buildRefundPosting,
  buildSalePosting,
  isBalanced,
  type PostingLine,
  type SaleAccounts,
} from "./accounting.logic.js";

const CASH = "1000";
const TAX = "2000";
const REVENUE = "4000";

/** Resolves the standard posting accounts from the company's chart. */
async function resolveSaleAccounts(
  tx: CompanyTx,
  companyId: string,
): Promise<SaleAccounts> {
  const rows = await tx
    .select({ id: tables.accountsChart.id, code: tables.accountsChart.code })
    .from(tables.accountsChart)
    .where(
      and(
        eq(tables.accountsChart.companyId, companyId),
        inArray(tables.accountsChart.code, [CASH, TAX, REVENUE]),
      ),
    );
  const byCode = new Map(rows.map((r) => [r.code, r.id]));
  const cash = byCode.get(CASH);
  const tax = byCode.get(TAX);
  const revenue = byCode.get(REVENUE);
  if (!cash || !tax || !revenue) {
    throw new HttpError(500, "Chart of accounts missing required accounts");
  }
  return { cashAccountId: cash, taxAccountId: tax, revenueAccountId: revenue };
}

async function writeEntry(
  tx: CompanyTx,
  companyId: string,
  opts: {
    sourceType: string;
    sourceId: string;
    memo: string;
    lines: PostingLine[];
    reversesEntryId?: string;
  },
): Promise<string> {
  if (!isBalanced(opts.lines)) {
    // Hard invariant — a financial integrity bug, never a user error.
    throw new HttpError(500, "Refusing to post an unbalanced journal entry");
  }
  const [entry] = await tx
    .insert(tables.journalEntries)
    .values({
      companyId,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      memo: opts.memo,
      reversesEntryId: opts.reversesEntryId ?? null,
    })
    .returning({ id: tables.journalEntries.id });
  const entryId = entry!.id;
  await tx.insert(tables.journalLines).values(
    opts.lines.map((l) => ({
      companyId,
      entryId,
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
    })),
  );
  return entryId;
}

/** Posts revenue for a settled order. Called inside the settle transaction. */
export async function postSale(
  tx: CompanyTx,
  companyId: string,
  order: { id: string; grandTotal: string; taxTotal: string },
): Promise<string> {
  const accounts = await resolveSaleAccounts(tx, companyId);
  const lines = buildSalePosting(accounts, order.grandTotal, order.taxTotal);
  return writeEntry(tx, companyId, {
    sourceType: "order.settle",
    sourceId: order.id,
    memo: `Sale ${order.id}`,
    lines,
  });
}

/** Posts a reversing entry for a refund. Called inside the refund transaction. */
export async function postRefund(
  tx: CompanyTx,
  companyId: string,
  order: { id: string },
  amount: string,
): Promise<string> {
  const accounts = await resolveSaleAccounts(tx, companyId);
  const lines = buildRefundPosting(accounts, amount);
  return writeEntry(tx, companyId, {
    sourceType: "order.refund",
    sourceId: order.id,
    memo: `Refund ${order.id}`,
    lines,
  });
}
