import { sql } from "drizzle-orm";
import { db, type Database } from "./client.js";

/**
 * A transaction handle scoped to a single Company. Every query issued through
 * `tx` runs under the RLS policy `company_id = current_setting('app.company_id')`.
 */
export type CompanyTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The ONLY sanctioned path to tenant data (ADR-0002).
 *
 * Opens a transaction, pins the active company with a **transaction-local**
 * GUC (`SET LOCAL`, so it dies with the transaction and can never leak onto a
 * pooled connection handed to the next request), then runs `fn`. Every query
 * inside is filtered by the RLS policy to `companyId`.
 *
 * Direct query construction outside this helper is a reviewable defect.
 */
export async function withCompany<T>(
  companyId: string,
  fn: (tx: CompanyTx) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(companyId)) {
    // Defense-in-depth: companyId flows from a verified JWT claim, but we never
    // interpolate an unvalidated value into a GUC.
    throw new Error("withCompany: companyId must be a valid UUID");
  }

  return db.transaction(async (tx) => {
    // set_config(setting, value, is_local=true) — parameterized, no string
    // interpolation into SQL. is_local=true == SET LOCAL semantics.
    await tx.execute(
      sql`select set_config('app.company_id', ${companyId}, true)`,
    );
    return fn(tx);
  });
}

/**
 * Escape hatch for legitimately cross-company platform/superadmin work (e.g.
 * resolving which Companies an Account belongs to at login — a pre-company
 * read that the normal tenant path cannot serve, ADR-0001).
 *
 * Sets the transaction-local `app.platform = 'on'` GUC, which the RLS policies
 * honor to allow cross-company access. Every call site must be audited.
 * Intentionally noisy to name and import.
 */
export async function withoutTenantScope<T>(
  fn: (tx: CompanyTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform', 'on', true)`);
    return fn(tx);
  });
}
