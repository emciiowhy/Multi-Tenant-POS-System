/** Server-side env accessors. Throw early if a required secret is missing. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const serverEnv = {
  /** Base URL of the Express backend, used for server-to-server calls. */
  apiUrl: () => process.env.API_URL ?? "http://localhost:4000",
  /** EdDSA private key (PKCS8 PEM). ONLY the frontend auth layer holds this. */
  jwtPrivateKey: () => required("JWT_PRIVATE_KEY"),
  /** EdDSA public key (SPKI PEM), published via the JWKS route. */
  jwtPublicKey: () => required("JWT_PUBLIC_KEY"),
};

/** Browser-safe API base. */
export const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
