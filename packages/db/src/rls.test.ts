import { describe, expect, it } from "vitest";
import { buildRlsStatements } from "./rls.js";
import { TENANT_TABLES } from "./schema/_shared.js";

describe("RLS policy generation", () => {
  const sql = buildRlsStatements().join("\n");

  it("enables and FORCES RLS on every tenant table", () => {
    for (const table of TENANT_TABLES) {
      expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(sql).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    }
  });

  it("fails closed: the policy uses current_setting(..., true) so an unset GUC yields NULL", () => {
    // The `true` second arg makes current_setting return NULL (not error) when
    // unset; comparing company_id = NULL is never true → no rows leak. The only
    // other branch requires the explicit platform GUC.
    for (const table of TENANT_TABLES) {
      expect(sql).toContain(
        `CREATE POLICY "${table}_tenant_isolation" ON "${table}" ` +
          `USING (company_id = current_setting('app.company_id', true)::uuid ` +
          `OR current_setting('app.platform', true) = 'on')`,
      );
    }
  });

  it("guards both reads (USING) and writes (WITH CHECK)", () => {
    expect(sql).toContain(
      "WITH CHECK (company_id = current_setting('app.company_id', true)::uuid " +
        "OR current_setting('app.platform', true) = 'on')",
    );
  });
});
