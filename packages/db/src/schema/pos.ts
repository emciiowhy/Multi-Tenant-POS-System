import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./identity.js";
import { products } from "./catalog.js";
import { pk, timestamps } from "./_shared.js";

/**
 * Order — the POS transaction. Lifecycle status:
 * open → fired → served → settled → (refunded | void).
 * Inventory moves at "fired"; revenue posts at "settled" (ADR-0006).
 */
export const orders = pgTable(
  "orders",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    registerId: uuid("register_id"),
    shiftId: uuid("shift_id"),
    /** Restaurant: which table this order is seated at (nullable for retail). */
    tableId: uuid("table_id"),
    status: text("status").notNull().default("open"),
    subtotal: numeric("subtotal", { precision: 14, scale: 4 }).notNull().default("0"),
    discountTotal: numeric("discount_total", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 4 }).notNull().default("0"),
    grandTotal: numeric("grand_total", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    firedAt: timestamp("fired_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    /** Idempotency for offline-created orders. */
    clientUuid: uuid("client_uuid").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_client_uuid_uq").on(t.companyId, t.clientUuid),
    index("orders_company_status_idx").on(t.companyId, t.status),
    index("orders_company_branch_created_idx").on(
      t.companyId,
      t.branchId,
      t.createdAt,
    ),
  ],
);

export const orderLines = pgTable(
  "order_lines",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id"),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 4 }).notNull(),
    modifiers: jsonb("modifiers").$type<Record<string, unknown>[]>(),
    ...timestamps,
  },
  (t) => [index("order_lines_company_order_idx").on(t.companyId, t.orderId)],
);

/** APPEND-ONLY tender ledger. A refund is a negative-amount payment row. */
export const payments = pgTable(
  "payments",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    /** "cash" | "card" | "bank_transfer" | "cheque" | "gift_card" | "loyalty" */
    method: text("method").notNull(),
    amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
    /** "capture" | "refund" */
    kind: text("kind").notNull().default("capture"),
    clientUuid: uuid("client_uuid").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("payments_client_uuid_uq").on(t.companyId, t.clientUuid),
    index("payments_company_order_idx").on(t.companyId, t.orderId),
  ],
);

/** A cashier's working period on a register. (Glossary: Shift, not Session.) */
export const shifts = pgTable(
  "shifts",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    registerId: uuid("register_id").notNull(),
    openedByAccountId: uuid("opened_by_account_id").notNull(),
    openingFloat: numeric("opening_float", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    closingCounted: numeric("closing_counted", { precision: 14, scale: 4 }),
    status: text("status").notNull().default("open"),
    openedAt: timestamps.createdAt,
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("shifts_company_register_idx").on(t.companyId, t.registerId)],
);

/** Cash drawer movements during a shift (pay-in, pay-out, drop). */
export const cashMovements = pgTable(
  "cash_movements",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id),
    amount: numeric("amount", { precision: 14, scale: 4 }).notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("cash_movements_company_shift_idx").on(t.companyId, t.shiftId)],
);

export const discounts = pgTable(
  "discounts",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    /** "percent" | "fixed" */
    kind: text("kind").notNull(),
    value: numeric("value", { precision: 14, scale: 4 }).notNull(),
    ...timestamps,
  },
  (t) => [index("discounts_company_idx").on(t.companyId)],
);

export const taxes = pgTable(
  "taxes",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    rate: numeric("rate", { precision: 9, scale: 6 }).notNull(),
    ...timestamps,
  },
  (t) => [index("taxes_company_idx").on(t.companyId)],
);
