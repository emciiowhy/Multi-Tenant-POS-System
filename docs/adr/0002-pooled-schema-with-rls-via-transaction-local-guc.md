# Pooled single schema, isolated by RLS via a transaction-local GUC

All Companies share one Neon Postgres database and one schema. Tenant isolation is enforced by Postgres Row Level Security policies of the form `USING (company_id = current_setting('app.company_id')::uuid)`. The current company is set **per transaction** with `SET LOCAL app.company_id = ...`, never plain `SET`, and always through a single mandatory repository helper (`withCompany(companyId, fn)`) that opens the transaction, sets the GUC, and runs all queries inside it.

## Why the SET LOCAL detail matters

Neon uses transaction-mode connection pooling. A session-scoped `SET` would leak the company setting onto whatever connection the pooler hands to the next request — a silent cross-tenant data breach under load. `SET LOCAL` is scoped to the transaction and is reset when it commits/rolls back, making it pooler-safe. For the same reason, the application's runtime database role must be a normal role with RLS enforced — **never** a superuser or a `BYPASSRLS` role, or the policies are silently ignored.

## Considered Options

- **App-layer-only filtering (no DB RLS):** rejected — one forgotten `WHERE company_id = ?` is an undetectable breach, and the product handles financial/POS data. RLS is required as defense-in-depth, not the only line of defense (the repo helper is still the first line).
- **Database-per-tenant on Neon:** rejected as the default — strongest isolation but fan-out migrations and connection explosion. Kept on the table as a future premium "dedicated isolation" billing tier for enterprise customers.

## Consequences

- There is exactly one sanctioned path to the database (the `withCompany` helper). Direct query construction outside it is a reviewable defect. Platform/superadmin operations that legitimately cross companies use a separate, explicitly-audited code path with its own role.
- Migrations stay simple (single schema), satisfying the "simple migrations" / scaling goals.
