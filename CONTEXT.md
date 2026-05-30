# VendMe

Multi-tenant POS + ERP SaaS platform. This glossary pins the canonical meaning of core domain terms so the same word never means two things across modules.

## Identity & Tenancy

**Account**:
A single login identity (one set of credentials, one human). An Account is NOT a tenant and owns no business data directly.
_Avoid_: User (reserved — see below), login, profile

**User**:
An Account as seen from inside one Company — i.e. the Account plus the role and permissions it holds there. The same Account is a different User in each Company it belongs to.
_Avoid_: member, seat

**Membership**:
The link between an Account and a Company, carrying the role(s) that Account holds in that Company. The thing that makes "multi-company session support" possible.
_Avoid_: assignment, grant

**Company**:
The unit of tenancy. One paying business = one Company = one `tenant_id`. The Row Level Security boundary and the billing target. All business data carries `company_id`.
_Avoid_: tenant (use Company in domain language; "tenant" only in infra/RLS discussion), organization, account, business

**Branch**:
A physical location or operational unit inside a Company (a store, a restaurant, a service bay). A sub-scope within the tenant, NOT its own tenant. Carries `branch_id`.
_Avoid_: location, store, outlet, site

**Register**:
A POS terminal/till within a Branch. The endpoint that opens shifts and reconciles cash.
_Avoid_: terminal, POS, till, station

**Session**:
An authenticated login lifetime for an Account, identified by a `sid` claim and revocable via the Redis revocation set. Strictly an auth concept.
_Avoid_: using "session" for a cashier's working period — that is a Shift (see POS).

**Active Company**:
The single Company a given Session's access token is currently scoped to (the `company` JWT claim). Changing it re-mints the token.
_Avoid_: current tenant, selected org
