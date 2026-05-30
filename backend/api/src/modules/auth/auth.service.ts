import { and, eq, isNull } from "drizzle-orm";
import { db, tables, withoutTenantScope } from "@vendme/db";
import { hashPassword, verifyPassword } from "@vendme/auth";
import { badRequest } from "../../lib/context.js";

export interface AccountSummary {
  id: string;
  email: string;
  displayName: string | null;
}

export interface MembershipSummary {
  companyId: string;
  companyName: string;
  companySlug: string;
  roleKey: string;
}

/** Registers a new Account (global; not tenant-scoped). */
export async function registerAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AccountSummary> {
  const email = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: tables.accounts.id })
    .from(tables.accounts)
    .where(eq(tables.accounts.email, email))
    .limit(1);
  if (existing.length > 0) throw badRequest("Email already registered");

  const passwordHash = await hashPassword(input.password);
  const [account] = await db
    .insert(tables.accounts)
    .values({ email, passwordHash, displayName: input.displayName ?? null })
    .returning({
      id: tables.accounts.id,
      email: tables.accounts.email,
      displayName: tables.accounts.displayName,
    });
  return account!;
}

/** Used by the NextAuth credentials provider. Returns null on bad credentials. */
export async function verifyCredentials(input: {
  email: string;
  password: string;
}): Promise<AccountSummary | null> {
  const email = input.email.trim().toLowerCase();
  const [account] = await db
    .select()
    .from(tables.accounts)
    .where(eq(tables.accounts.email, email))
    .limit(1);
  if (!account?.passwordHash) return null;
  const ok = await verifyPassword(input.password, account.passwordHash);
  if (!ok) return null;
  return { id: account.id, email: account.email, displayName: account.displayName };
}

/**
 * Lists the Companies an Account belongs to. This is a CROSS-COMPANY read used
 * before a company is selected, so it runs on the audited platform path
 * (ADR-0001), not the normal tenant data path.
 */
export async function listAccountMemberships(
  accountId: string,
): Promise<MembershipSummary[]> {
  return withoutTenantScope(async (tx) => {
    return tx
      .select({
        companyId: tables.companies.id,
        companyName: tables.companies.name,
        companySlug: tables.companies.slug,
        roleKey: tables.roles.key,
      })
      .from(tables.memberships)
      .innerJoin(tables.companies, eq(tables.companies.id, tables.memberships.companyId))
      .innerJoin(tables.roles, eq(tables.roles.id, tables.memberships.roleId))
      .where(
        and(
          eq(tables.memberships.accountId, accountId),
          eq(tables.memberships.status, "active"),
          isNull(tables.memberships.deletedAt),
        ),
      );
  });
}

/**
 * Authoritatively confirms an Account's role in a Company. Called when minting
 * or re-minting a token (login / switch) so the `company` + `role` claims can
 * never exceed what the Membership grants.
 */
export async function resolveMembership(
  accountId: string,
  companyId: string,
): Promise<MembershipSummary | null> {
  const all = await listAccountMemberships(accountId);
  return all.find((m) => m.companyId === companyId) ?? null;
}
