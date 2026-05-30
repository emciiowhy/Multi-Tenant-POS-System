import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { buildRlsStatements } from "./rls.js";

/**
 * Applies Drizzle migrations, then (re)installs RLS policies. Runs against the
 * UNPOOLED/direct connection so DDL isn't fragmented by the transaction pooler.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  console.log("→ running schema migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("→ installing RLS policies");
  for (const stmt of buildRlsStatements()) {
    await db.execute(sql.raw(stmt));
  }

  await pool.end();
  console.log("✓ migrate complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
