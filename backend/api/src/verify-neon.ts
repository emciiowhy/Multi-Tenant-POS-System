/**
 * Smoke-test the backend against the configured database (e.g. Neon). Unlike
 * verify-live.ts (which boots an in-process PGlite), this uses whatever
 * DATABASE_URL the environment provides. Run with the env file loaded, e.g.:
 *
 *   pnpm --filter @vendme/backend-api exec tsx --env-file=../.env src/verify-neon.ts
 *
 * Seeds idempotently, then reads the floor plan + KDS board back through the
 * real service functions — proving the round-trip and, on a normal (non-
 * superuser) role like Neon's, that RLS-scoped reads actually work.
 */
import { seedDemo } from "./seed.js";
import { getFloorPlan } from "./modules/restaurant/table.service.js";
import { listTickets } from "./modules/restaurant/kds.service.js";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL not set — run with: tsx --env-file=../.env src/verify-neon.ts",
    );
  }

  // eslint-disable-next-line no-console
  console.log("→ seeding (idempotent) against the configured database…\n");
  const { companyId, branchId } = await seedDemo();

  // eslint-disable-next-line no-console
  console.log("\n→ reading it back via the real service functions…");
  const plan = await getFloorPlan(companyId, branchId);
  const tickets = await listTickets(companyId, branchId);
  // eslint-disable-next-line no-console
  console.log(`  floor plan: ${plan.sections.length} sections, ${plan.tables.length} tables`);
  // eslint-disable-next-line no-console
  console.log(`  KDS board:  ${tickets.length} active tickets`);

  if (plan.sections.length !== 2 || plan.tables.length !== 6) {
    throw new Error(
      `unexpected floor plan shape (sections=${plan.sections.length}, tables=${plan.tables.length})`,
    );
  }
  if (tickets.length < 1) throw new Error("expected at least one active KDS ticket");

  // eslint-disable-next-line no-console
  console.log("\n✓ Round-trip OK — the backend talks to the configured database for real.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("\n✗ verify-neon failed:", err);
    process.exit(1);
  });
