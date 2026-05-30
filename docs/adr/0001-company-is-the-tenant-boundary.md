# Company is the unit of tenancy

The RLS boundary and billing target is the **Company**. `tenant_id == company_id`, and every business table carries `company_id`. An Account (login identity) reaches data only through a Membership that links it to a Company; Branches and Registers are sub-scopes *within* a Company, not tenants of their own.

## Considered Options

- **Account = tenant (companies nested under it):** rejected — mingles multiple companies' data under one RLS scope and makes per-company billing/quota awkward, which fights the "isolated tenant data" + "tenant billing isolation" requirements.
- **Branch = tenant:** rejected — maximum blast-radius isolation, but consolidated company-wide ERP reporting and accounting (a core premise) would become cross-tenant queries.

## Consequences

- Session JWT must carry `accountId + activeCompanyId + role`; switching company re-issues a company-scoped token. There is no "all companies" query path through the tenant-scoped API.
- Cross-company reporting for an Account that owns several companies (e.g. a franchisee) is an explicit, separate, non-RLS-scoped concern — not something the normal data path supports.
