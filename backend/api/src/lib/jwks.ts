import {
  createRemoteJWKSet,
  createLocalJWKSet,
  exportJWK,
  importSPKI,
  jwtVerify,
} from "jose";
import { accessTokenClaims, type AccessTokenClaims } from "@vendme/contracts";
import { env } from "../env.js";

const ALG = "EdDSA";

type Resolver = Parameters<typeof jwtVerify>[1];

/**
 * Builds a verification function. Prefers a remote JWKS endpoint (the Next.js
 * auth layer publishes one, ADR-0004); falls back to a single static public
 * key for local/dev. The API NEVER holds a private key.
 */
async function buildResolver(): Promise<Resolver> {
  if (env.JWKS_URL) {
    return createRemoteJWKSet(new URL(env.JWKS_URL));
  }
  if (env.JWT_PUBLIC_KEY) {
    const key = await importSPKI(env.JWT_PUBLIC_KEY, ALG);
    const jwk = await exportJWK(key);
    jwk.alg = ALG;
    jwk.kid = "vendme-access";
    return createLocalJWKSet({ keys: [jwk] });
  }
  throw new Error("Auth misconfigured: set JWKS_URL or JWT_PUBLIC_KEY");
}

let resolverPromise: Promise<Resolver> | null = null;

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  resolverPromise ??= buildResolver();
  const resolver = await resolverPromise;
  const { payload } = await jwtVerify(token, resolver, { algorithms: [ALG] });
  return accessTokenClaims.parse(payload);
}
