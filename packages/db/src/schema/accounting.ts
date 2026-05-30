import {
  index,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./identity.js";
import { pk, timestamps } from "./_shared.js";

/** Chart of accounts. type ∈ asset | liability | equity | revenue | expense. */
export const accountsChart = pgTable(
  "accounts_chart",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("accounts_chart_company_code_uq").on(t.companyId, t.code)],
);

/** A balanced double-entry transaction. Its lines must sum debits == credits. */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    /** Source reference, e.g. order id, that produced this entry. */
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    memo: text("memo"),
    /** If this entry reverses another (refund/void). */
    reversesEntryId: uuid("reverses_entry_id"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("journal_entries_company_source_idx").on(
      t.companyId,
      t.sourceType,
      t.sourceId,
    ),
  ],
);

/** APPEND-ONLY ledger lines (ADR-0006). Balances are SUM(debit) - SUM(credit). */
export const journalLines = pgTable(
  "journal_lines",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => journalEntries.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsChart.id),
    debit: numeric("debit", { precision: 14, scale: 4 }).notNull().default("0"),
    credit: numeric("credit", { precision: 14, scale: 4 }).notNull().default("0"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("journal_lines_projection_idx").on(
      t.companyId,
      t.accountId,
      t.createdAt,
    ),
    index("journal_lines_entry_idx").on(t.companyId, t.entryId),
  ],
);
