"use client";

export interface AccessTokenResponse {
  accessToken: string;
  company: {
    companyId: string;
    companyName: string;
    companySlug: string;
    roleKey: string;
  };
}

let cached: AccessTokenResponse | null = null;

/**
 * Fetches (and caches) the session's current access token from the Next API
 * route (which mints it for the active company, ADR-0004). The browser then
 * presents this token as a Bearer credential to the Express backend and in the
 * realtime handshake. Pass `force` to re-mint after expiry or a company switch.
 */
export async function getAccessToken(force = false): Promise<AccessTokenResponse> {
  if (cached && !force) return cached;
  const res = await fetch("/api/access-token", { cache: "no-store" });
  if (!res.ok) {
    cached = null;
    throw new Error(`access-token request failed: ${res.status}`);
  }
  cached = (await res.json()) as AccessTokenResponse;
  return cached;
}
