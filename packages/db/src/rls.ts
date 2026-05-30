import { TENANT_TABLES, type TenantTable } from "./schema/_shared.js";

/**
 * Generates the SQL that enables RLS and installs the tenant-isolation policy
 * for every tenant-scoped table (ADR-0002).
 *
 * Policy: a row is visible/mutable when its `company_id` equals the
 * transaction-local GUC `app.company_id`, OR when the transaction is running on
 * the explicitly-audited platform path (`app.platform = 'on'`, set only by
 * {@link withoutTenantScope} — see ADR-0001). When neither GUC is set,
 * `current_setting(..., true)` returns NULL and the predicate is false for every
 * row — i.e. the system FAILS CLOSED (no company, no data).
 *
 * `FORCE ROW LEVEL SECURITY` ensures the policy also applies to the table
 * owner, so a misconfigured connection can't accidentally bypass it.
 */
export function buildRlsStatements(
  tables: readonly TenantTable[] = TENANT_TABLES,
): string[] {
  const predicate =
    "(company_id = current_setting('app.company_id', true)::uuid " +
    "OR current_setting('app.platform', true) = 'on')";
  const stmts: string[] = [];
  for (const table of tables) {
    stmts.push(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    stmts.push(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    stmts.push(`DROP POLICY IF EXISTS "${table}_tenant_isolation" ON "${table}";`);
    stmts.push(
      `CREATE POLICY "${table}_tenant_isolation" ON "${table}" ` +
        `USING ${predicate} ` +
        `WITH CHECK ${predicate};`,
    );
  }
  return stmts;
}

export const rlsSql = (): string => buildRlsStatements().join("\n");
