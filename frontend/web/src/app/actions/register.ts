"use server";

import { serverEnv } from "@/lib/env";

export interface RegisterResult {
  ok: boolean;
  /** `email_taken` (400), `invalid` (422 validation), or `network`/unknown. */
  error?: "email_taken" | "invalid" | "network";
}

/**
 * Creates an Account via the backend's public `POST /v1/auth/register`
 * (Auth overhaul PRD §1.2). Unauthenticated — the new account has no tenant yet;
 * the caller signs in and then onboarding creates the first company (§2.3).
 * Runs server-side so the backend base URL / headers stay off the client.
 */
export async function registerAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<RegisterResult> {
  try {
    const res = await fetch(`${serverEnv.apiUrl()}/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.status === 201) return { ok: true };
    if (res.status === 400) return { ok: false, error: "email_taken" }; // "Email already registered"
    if (res.status === 422) return { ok: false, error: "invalid" }; // schema validation
    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}
