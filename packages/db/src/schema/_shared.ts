import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Primary key column: server-generated UUID. */
export const pk = () => uuid("id").primaryKey().defaultRandom();

/** created/updated/deleted timestamps. Soft delete via `deletedAt`. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * Names of every tenant-scoped table. The migrate step enables RLS and creates
 * the `company_id = current_setting('app.company_id')::uuid` policy for each.
 * Adding a tenant table without listing it here is a security defect, so the
 * list is asserted against the live schema in tests.
 */
export const TENANT_TABLES = [
  "memberships",
  "branches",
  "registers",
  "roles",
  "role_permissions",
  "products",
  "product_variants",
  "stock_items",
  "recipes",
  "stock_movements",
  "orders",
  "order_lines",
  "payments",
  "shifts",
  "cash_movements",
  "discounts",
  "taxes",
  "accounts_chart",
  "journal_entries",
  "journal_lines",
  "tables",
  "floor_sections",
  "kitchen_tickets",
  "subscriptions",
  "usage_counters",
  "invoices",
  "files",
  "notifications",
  "activity_log",
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

export { sql };
