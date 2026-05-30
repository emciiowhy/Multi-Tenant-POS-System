export { db, pool, schema, type Database, type Schema } from "./client.js";
export {
  withCompany,
  withoutTenantScope,
  type CompanyTx,
} from "./with-company.js";
export { buildRlsStatements, rlsSql } from "./rls.js";
export * as tables from "./schema/index.js";
export { TENANT_TABLES, type TenantTable } from "./schema/_shared.js";
