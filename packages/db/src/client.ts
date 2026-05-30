import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

/**
 * The application connects through a transaction-mode pooler (e.g. Neon's
 * pooled endpoint). Tenant isolation depends on `SET LOCAL` (transaction-scoped)
 * GUCs — see {@link withCompany}. The runtime role MUST be a normal,
 * RLS-enforced role: never a superuser and never `BYPASSRLS` (ADR-0002).
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    // Keep pooled connections modest; the pooler multiplexes for us.
    max: Number(process.env.DB_POOL_MAX ?? 10),
  });
}

export const pool = createPool();

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
export type Schema = typeof schema;
export { schema };
