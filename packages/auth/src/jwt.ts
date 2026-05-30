import {
  SignJWT,
  jwtVerify,
  exportJWK,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  type JWTPayload,
  type KeyLike,
  createLocalJWKSet,
} from "jose";
import { accessTokenClaims, type AccessTokenClaims } from "@vendme/contracts";

const ALG = "EdDSA";
const ACCESS_TTL_SECONDS = 10 * 60; // 10 minutes (ADR-0004)

/**
 * Mints short-lived asymmetric access tokens. ONLY the Next.js auth layer holds
 * a Minter (it has the private key). The API never imports this with a private
 * key — it only verifies (ADR-0004).
 */
export class JwtMinter {
  private constructor(
    private readonly privateKey: KeyLike,
    private readonly kid: string,
  ) {}

  static async fromPkcs8(pkcs8: string, kid = "vendme-access"): Promise<JwtMinter> {
    return new JwtMinter(await importPKCS8(pkcs8, ALG), kid);
  }

  async mint(input: {
    accountId: string;
    companyId: string;
    role: string;
    sid: string;
  }): Promise<string> {
    return new SignJWT({ company: input.companyId, role: input.role, sid: input.sid })
      .setProtectedHeader({ alg: ALG, kid: this.kid })
      .setSubject(input.accountId)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
      .sign(this.privateKey);
  }
}

/**
 * Verifies access tokens statelessly against a JWKS. The API uses this — it
 * holds the public key only and can never mint.
 */
export class JwtVerifier {
  private constructor(private readonly jwks: ReturnType<typeof createLocalJWKSet>) {}

  static async fromPublicKey(spki: string, kid = "vendme-access"): Promise<JwtVerifier> {
    const publicKey = await importSPKI(spki, ALG);
    const jwk = await exportJWK(publicKey);
    jwk.kid = kid;
    jwk.alg = ALG;
    return new JwtVerifier(createLocalJWKSet({ keys: [jwk] }));
  }

  static fromJwks(jwks: { keys: JWTPayload[] }): JwtVerifier {
    return new JwtVerifier(
      createLocalJWKSet(jwks as unknown as Parameters<typeof createLocalJWKSet>[0]),
    );
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.jwks, { algorithms: [ALG] });
    return accessTokenClaims.parse(payload);
  }
}

/** Dev/bootstrap helper: generate an EdDSA keypair as PKCS8/SPKI PEM strings. */
export async function generateAccessKeyPair(): Promise<{
  privateKeyPkcs8: string;
  publicKeySpki: string;
}> {
  const { privateKey, publicKey } = await generateKeyPair(ALG, { extractable: true });
  const { exportPKCS8, exportSPKI } = await import("jose");
  return {
    privateKeyPkcs8: await exportPKCS8(privateKey),
    publicKeySpki: await exportSPKI(publicKey),
  };
}

export { ACCESS_TTL_SECONDS, ALG };
