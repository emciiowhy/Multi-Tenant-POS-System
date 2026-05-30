import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { pk, timestamps } from "./_shared.js";

/**
 * Account — a single login identity. NOT a tenant; owns no business data
 * directly. Reaches a Company only through a Membership. (CONTEXT.md)
 */
export const accounts = pgTable(
  "accounts",
  {
    id: pk(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    ...timestamps,
  },
  (t) => [uniqueIndex("accounts_email_uq").on(t.email)],
);

/**
 * Company — the unit of tenancy. One Company == one `tenant_id` == the RLS
 * boundary and billing target. (ADR-0001)
 */
export const companies = pgTable(
  "companies",
  {
    id: pk(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industry: text("industry").notNull().default("retail"),
    /** Per-company module enablement, e.g. { restaurant: true }. */
    enabledModules: jsonb("enabled_modules")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex("companies_slug_uq").on(t.slug)],
);

/**
 * Role — a named bundle of permissions within a Company. System roles
 * (isSystem) are seeded; companies may add custom roles.
 */
export const roles = pgTable(
  "roles",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    /** Role this one inherits permissions from (single-parent inheritance). */
    inheritsRoleId: uuid("inherits_role_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("roles_company_key_uq").on(t.companyId, t.key)],
);

/**
 * Permission — a global catalogue of `module:resource:action` strings. Not
 * tenant-scoped (the catalogue is the same everywhere); the grant is.
 */
export const permissions = pgTable(
  "permissions",
  {
    id: pk(),
    key: text("key").notNull(),
    description: text("description"),
  },
  (t) => [uniqueIndex("permissions_key_uq").on(t.key)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
  },
  (t) => [
    uniqueIndex("role_permissions_uq").on(t.roleId, t.permissionId),
    index("role_permissions_company_idx").on(t.companyId),
  ],
);

/**
 * Membership — links an Account to a Company with a Role. The thing that makes
 * multi-company sessions possible. (CONTEXT.md)
 */
export const memberships = pgTable(
  "memberships",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    /** Optional restriction of this membership to a single branch. */
    branchId: uuid("branch_id"),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("memberships_account_company_uq").on(t.accountId, t.companyId),
    index("memberships_company_idx").on(t.companyId),
  ],
);

export const branches = pgTable(
  "branches",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    address: jsonb("address").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("branches_company_idx").on(t.companyId)],
);

export const registers = pgTable(
  "registers",
  {
    id: pk(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [index("registers_company_branch_idx").on(t.companyId, t.branchId)],
);

export const accountsRelations = relations(accounts, ({ many }) => ({
  memberships: many(memberships),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  memberships: many(memberships),
  branches: many(branches),
  roles: many(roles),
}));
