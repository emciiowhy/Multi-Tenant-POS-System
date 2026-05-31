import { and, eq } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";

/**
 * Decides whether the (companyId, accountId) behind a socket may join the
 * realtime rooms of `branchId`. `companyId` and `accountId` come from the
 * verified JWT claim; `branchId` is the only client-supplied value, so it is a
 * scope-*down* that must be validated — never a way to widen access.
 */
export type BranchAuthorizer = (
  companyId: string,
  accountId: string,
  branchId: string,
) => Promise<boolean>;

/**
 * Default authorizer. Runs through the one sanctioned tenant path
 * (`withCompany`/RLS, ADR-0002), so a Branch belonging to another Company is
 * invisible and yields `false`. Within the company, a Membership pinned to a
 * single branch (`memberships.branchId`) may join only that branch; an
 * unpinned membership may join any branch in the company. Company id is also
 * pinned in each WHERE as belt-and-suspenders alongside RLS, matching the
 * service-layer convention.
 */
export const authorizeBranch: BranchAuthorizer = async (
  companyId,
  accountId,
  branchId,
) =>
  withCompany(companyId, async (tx) => {
    const [branch] = await tx
      .select({ id: tables.branches.id })
      .from(tables.branches)
      .where(
        and(
          eq(tables.branches.companyId, companyId),
          eq(tables.branches.id, branchId),
        ),
      )
      .limit(1);
    if (!branch) return false;

    const [membership] = await tx
      .select({ branchId: tables.memberships.branchId })
      .from(tables.memberships)
      .where(
        and(
          eq(tables.memberships.companyId, companyId),
          eq(tables.memberships.accountId, accountId),
        ),
      )
      .limit(1);
    if (!membership) return false;

    return membership.branchId === null || membership.branchId === branchId;
  });
