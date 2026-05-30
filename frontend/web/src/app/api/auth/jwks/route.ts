import { NextResponse } from "next/server";
import { publicJwks } from "@/lib/access-token";

// Reads server-only key material at request time; never statically evaluated.
export const dynamic = "force-dynamic";

/**
 * Publishes the public JWK set. The backend's JwtVerifier fetches this to
 * verify access tokens (ADR-0004). Cached briefly; key rotation publishes a new
 * kid here without redeploying verifiers.
 */
export async function GET() {
  const jwks = await publicJwks();
  return NextResponse.json(jwks, {
    headers: { "cache-control": "public, max-age=300, must-revalidate" },
  });
}
