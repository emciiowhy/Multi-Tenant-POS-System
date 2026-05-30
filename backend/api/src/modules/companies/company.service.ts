import { eq } from "drizzle-orm";
import { db, tables, withCompany } from "@vendme/db";
import { PERMISSIONS, SYSTEM_ROLES, WILDCARD, resolvePermissions } from "@vendme/auth";
import { badRequest } from "../../lib/context.js";

/** A minimal default chart of accounts so posting works out of the box. */
const DEFAULT_CHART: { code: string; name: string; type: string }[] = [
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1100", name: "Inventory", type: "asset" },
  { code: "2000", name: "Tax Payable", type: "liability" },
  { code: "3000", name: "Owner Equity", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "revenue" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
];

/** Ensures the global permission catalogue exists (idempotent). */
async function ensurePermissionCatalogue(): Promise<Map<string, string>> {
  await db
    .insert(tables.permissions)
    .values(PERMISSIONS.map((key) => ({ key })))
    .onConflictDoNothing({ target: tables.permissions.key });
  const rows = await db
    .select({ id: tables.permissions.id, key: tables.permissions.key })
    .from(tables.permissions);
  return new Map(rows.map((r) => [r.key, r.id]));
}

export interface CreatedCompany {
  id: string;
  name: string;
  slug: string;
  ownerMembershipId: string;
}

/**
 * Creates a Company and bootstraps everything an empty tenant needs:
 * system roles (with their permission grants), a default chart of accounts, and
 * an owner Membership for the creating Account. Tenant-scoped inserts run under
 * the new company's GUC so RLS WITH CHECK passes (ADR-0002).
 */
export async function createCompanyWithOwner(input: {
  name: string;
  slug: string;
  industry?: string;
  ownerAccountId: string;
}): Promise<CreatedCompany> {
  const slug = input.slug.trim().toLowerCase();
  const clash = await db
    .select({ id: tables.companies.id })
    .from(tables.companies)
    .where(eq(tables.companies.slug, slug))
    .limit(1);
  if (clash.length > 0) throw badRequest("Company slug already taken");

  const permIdByKey = await ensurePermissionCatalogue();

  // Company row itself is global (not RLS-scoped).
  const [company] = await db
    .insert(tables.companies)
    .values({
      name: input.name,
      slug,
      industry: input.industry ?? "retail",
      enabledModules: input.industry === "restaurant" ? { restaurant: true } : {},
    })
    .returning();
  const companyId = company!.id;

  const ownerMembershipId = await withCompany(companyId, async (tx) => {
    // 1. Seed system roles for this company.
    const roleIdByKey = new Map<string, string>();
    for (const def of SYSTEM_ROLES) {
      const [role] = await tx
        .insert(tables.roles)
        .values({ companyId, key: def.key, name: def.name, isSystem: true })
        .returning({ id: tables.roles.id });
      roleIdByKey.set(def.key, role!.id);
    }

    // 2. Persist each role's resolved permission grants (skip wildcard —
    //    super_admin is enforced at runtime via can()).
    for (const def of SYSTEM_ROLES) {
      const roleId = roleIdByKey.get(def.key)!;
      const perms = resolvePermissions(def.key);
      const rows = [...perms]
        .filter((p) => p !== WILDCARD)
        .map((p) => permIdByKey.get(p))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ companyId, roleId, permissionId }));
      if (rows.length > 0) {
        await tx.insert(tables.rolePermissions).values(rows).onConflictDoNothing();
      }
    }

    // 3. Default chart of accounts.
    await tx
      .insert(tables.accountsChart)
      .values(DEFAULT_CHART.map((a) => ({ companyId, ...a })));

    // 4. Owner membership.
    const ownerRoleId = roleIdByKey.get("company_owner")!;
    const [membership] = await tx
      .insert(tables.memberships)
      .values({
        companyId,
        accountId: input.ownerAccountId,
        roleId: ownerRoleId,
      })
      .returning({ id: tables.memberships.id });
    return membership!.id;
  });

  return { id: companyId, name: company!.name, slug, ownerMembershipId };
}
