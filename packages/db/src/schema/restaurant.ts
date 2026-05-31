import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./identity.js";
import { pk, timestamps } from "./_shared.js";

/**
 * Restaurant vertical (ADR-0005). Registered via the module framework and
 * enabled per-company. These tables exist regardless but are only exercised
 * when `companies.enabledModules.restaurant === true`.
 */

export const floorSections = pgTable(
  "floor_sections",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [index("floor_sections_company_branch_idx").on(t.companyId, t.branchId)],
);

export const tables = pgTable(
  "tables",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    sectionId: uuid("section_id"),
    label: text("label").notNull(),
    seats: integer("seats").notNull().default(2),
    /** "free" | "seated" | "ordered" | "bill" */
    status: text("status").notNull().default("free"),
    /** Floor-plan layout: position and size on the section canvas (px). */
    posX: integer("pos_x").notNull().default(0),
    posY: integer("pos_y").notNull().default(0),
    width: integer("width").notNull().default(80),
    height: integer("height").notNull().default(80),
    /** "rect" | "circle" */
    shape: text("shape").notNull().default("rect"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("tables_company_branch_label_uq").on(
      t.companyId,
      t.branchId,
      t.label,
    ),
  ],
);

/** A fired ticket shown on the Kitchen Display System. */
export const kitchenTickets = pgTable(
  "kitchen_tickets",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id").notNull(),
    orderId: uuid("order_id").notNull(),
    /** "queued" | "preparing" | "ready" | "served" */
    status: text("status").notNull().default("queued"),
    firedAt: timestamps.createdAt,
    readyAt: timestamp("ready_at", { withTimezone: true }),
  },
  (t) => [
    index("kitchen_tickets_company_branch_status_idx").on(
      t.companyId,
      t.branchId,
      t.status,
    ),
  ],
);
