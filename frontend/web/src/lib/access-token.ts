import "server-only";
import { exportJWK, importSPKI } from "jose";
import { JwtMinter } from "@vendme/auth";
import { serverEnv } from "./env";

/**
 * The access-token minting authority (ADR-0004). Lives ONLY in the Next.js auth
 * layer because it needs the private key. Mints short-lived EdDSA tokens whose
 * `company` claim is re-issued on every company switch.
 */
let minterPromise: Promise<JwtMinter> | null = null;

export function getMinter(): Promise<JwtMinter> {
  minterPromise ??= JwtMinter.fromPkcs8(serverEnv.jwtPrivateKey());
  return minterPromise;
}

export async function mintAccessToken(input: {
  accountId: string;
  companyId: string;
  role: string;
  sid: string;
}): Promise<string> {
  const minter = await getMinter();
  return minter.mint(input);
}

/**
 * Mints a short-lived ACCOUNT-scoped token (no `company` claim) so a tenant-less
 * account can create its first company (PRD §2.3). Accepted only by the backend's
 * `authenticateAccount` guard on `POST /v1/companies`; company-scoped routes
 * reject it. Same `sid`, so it's revocable alongside the session (ADR-0004).
 */
export async function mintOnboardingToken(input: {
  accountId: string;
  sid: string;
}): Promise<string> {
  const minter = await getMinter();
  return minter.mint({ accountId: input.accountId, role: "", sid: input.sid });
}

/** Public JWK set served at /api/auth/jwks for the backend to verify tokens. */
export async function publicJwks(): Promise<{ keys: Record<string, unknown>[] }> {
  const key = await importSPKI(serverEnv.jwtPublicKey(), "EdDSA");
  const jwk = await exportJWK(key);
  return {
    keys: [{ ...jwk, alg: "EdDSA", use: "sig", kid: "vendme-access" }],
  };
}
