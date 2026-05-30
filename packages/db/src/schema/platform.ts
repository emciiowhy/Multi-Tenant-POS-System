import {
  bigint,
  boolean,
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
import { pk, timestamps } from "./_shared.js";

/** Subscription plans (global catalogue). */
export const plans = pgTable(
  "plans",
  {
    id: pk(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    priceMonthly: numeric("price_monthly", { precision: 14, scale: 2 }).notNull(),
    limits: jsonb("limits").$type<Record<string, number>>().notNull().default({}),
  },
  (t) => [uniqueIndex("plans_key_uq").on(t.key)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").notNull().default("trialing"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("subscriptions_company_uq").on(t.companyId)],
);

/** Per-company usage counters for quota enforcement (seats, storage bytes…). */
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    metric: text("metric").notNull(),
    value: bigint("value", { mode: "bigint" }).notNull().default(0n),
    ...timestamps,
  },
  (t) => [uniqueIndex("usage_counters_company_metric_uq").on(t.companyId, t.metric)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    number: text("number").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: text("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("invoices_company_number_uq").on(t.companyId, t.number)],
);

/** R2 object references with per-company quota accounting. */
export const files = pgTable(
  "files",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    key: text("key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    /** "pending" | "scanned_clean" | "scanned_infected" */
    scanStatus: text("scan_status").notNull().default("pending"),
    uploadedByAccountId: uuid("uploaded_by_account_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("files_company_key_uq").on(t.companyId, t.key),
    index("files_company_idx").on(t.companyId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    accountId: uuid("account_id").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("notifications_company_account_idx").on(t.companyId, t.accountId),
  ],
);

/** APPEND-ONLY audit trail. Who did what, in which company. */
export const activityLog = pgTable(
  "activity_log",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    actorAccountId: uuid("actor_account_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("activity_log_company_created_idx").on(t.companyId, t.createdAt),
  ],
);

/**
 * Audit record of token revocations. The authoritative "revoke now" check is
 * the Redis revocation set (ADR-0004); this table is the durable log.
 */
export const jwtRevocations = pgTable(
  "jwt_revocations",
  {
    id: pk(),
    sid: uuid("sid").notNull(),
    accountId: uuid("account_id").notNull(),
    reason: text("reason"),
    revokedAt: timestamps.createdAt,
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("jwt_revocations_sid_idx").on(t.sid)],
);
