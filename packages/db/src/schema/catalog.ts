import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./identity.js";
import { pk, timestamps } from "./_shared.js";

/** A sellable thing: a retail product or a restaurant menu item. */
export const products = pgTable(
  "products",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    sku: text("sku"),
    name: text("name").notNull(),
    /** "good" deducts its own stock; "menu_item" deducts via recipe BOM. */
    kind: text("kind").notNull().default("good"),
    price: numeric("price", { precision: 14, scale: 4 }).notNull().default("0"),
    taxId: uuid("tax_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("products_company_idx").on(t.companyId),
    uniqueIndex("products_company_sku_uq").on(t.companyId, t.sku),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    name: text("name").notNull(),
    barcode: text("barcode"),
    priceDelta: numeric("price_delta", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    index("variants_company_product_idx").on(t.companyId, t.productId),
    index("variants_company_barcode_idx").on(t.companyId, t.barcode),
  ],
);

/** A tracked inventory unit (an ingredient, or a good's own stock). */
export const stockItems = pgTable(
  "stock_items",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("each"),
    ...timestamps,
  },
  (t) => [index("stock_items_company_idx").on(t.companyId)],
);

/** Bill of materials: one product line consumes `quantity` of a stock item. */
export const recipes = pgTable(
  "recipes",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    stockItemId: uuid("stock_item_id")
      .notNull()
      .references(() => stockItems.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("recipes_product_stock_uq").on(t.productId, t.stockItemId),
    index("recipes_company_idx").on(t.companyId),
  ],
);

/**
 * APPEND-ONLY inventory ledger (ADR-0006). On-hand is the sum of `qtyDelta`.
 * Never UPDATE/DELETE. `clientUuid` is the idempotency key for offline replay.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    stockItemId: uuid("stock_item_id")
      .notNull()
      .references(() => stockItems.id),
    qtyDelta: numeric("qty_delta", { precision: 14, scale: 4 }).notNull(),
    /** "fire" | "refund" | "adjustment" | "receive" | "waste" */
    reason: text("reason").notNull(),
    orderId: uuid("order_id"),
    /** Sequence assigned by server on accept; orders the ledger deterministically. */
    seq: integer("seq"),
    clientUuid: uuid("client_uuid").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("stock_movements_client_uuid_uq").on(t.companyId, t.clientUuid),
    index("stock_movements_projection_idx").on(
      t.companyId,
      t.stockItemId,
      t.createdAt,
    ),
  ],
);
