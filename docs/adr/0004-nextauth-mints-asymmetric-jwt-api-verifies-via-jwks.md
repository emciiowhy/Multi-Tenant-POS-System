# NextAuth mints asymmetric access JWTs; the API verifies statelessly via JWKS

NextAuth v5 is the sole token-minting authority. On login and on company-switch it issues a short-lived (~10 min) access JWT signed with an asymmetric private key (EdDSA, or RS256), carrying `sub` (accountId), `company` (activeCompanyId), `role`, and `sid` (a session id). The browser sends it as a `Bearer` token. The Express API verifies it statelessly against a published JWKS endpoint and holds only the public key — **the API can verify but can never mint a token.** The long-lived refresh token lives only in an httpOnly cookie in the Next.js layer.

## Why

- Asymmetric signing means a compromise of the API host does not yield token-forgery power, and keys can be rotated by publishing a new JWKS key without redeploying every verifier. A shared HS256 secret was rejected for putting minting power in two deployments.
- A short access-token lifetime is what makes company-switching correct: `POST /auth/switch` re-mints with a new `company` claim, so the RLS `company_id` (ADR-0002) is always exactly what the token says.

## Consequences

- The Next.js layer must run a JWKS endpoint and a key-rotation process.
- Stateless verification can't instantly kill a token. For the "revoke now" case (logout, compromised session, fired employee), the API checks `sid` against a small revocation set in Redis. This keeps the common path stateless while still allowing immediate kill.
- Every authenticated API request resolves to exactly one `company` claim, which feeds directly into `withCompany(...)`. There is no token that is valid for "all companies."
