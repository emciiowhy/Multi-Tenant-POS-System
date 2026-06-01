"use server";

import { auth } from "@/auth";
import { mintOnboardingToken } from "@/lib/access-token";
import { serverEnv } from "@/lib/env";
import type { RawMembership } from "@/lib/auth/session-view";

export interface CreateCompanyResult {
  ok: boolean;
  /** The new owner membership, ready to fold into the session. */
  membership?: RawMembership;
  error?: "slug_taken" | "unauthenticated" | "invalid" | "network";
}

/**
 * Creates the caller's first (or next) company (Auth overhaul PRD §2.3). Runs
 * server-side: mints an account-scoped onboarding token for the current session
 * and calls the backend `POST /v1/companies` (the `authenticateAccount` guard
 * accepts the company-less token). The creator becomes the company owner; the
 * returned membership is handed to `useAppSession().addCompany` to update the
 * session without a re-login. Secrets/headers never reach the client.
 */
export async function createCompany(input: {
  name: string;
  slug: string;
  industry?: string;
}): Promise<CreateCompanyResult> {
  const session = await auth();
  if (!session?.accountId) return { ok: false, error: "unauthenticated" };

  try {
    const token = await mintOnboardingToken({ accountId: session.accountId, sid: session.sid });
    const res = await fetch(`${serverEnv.apiUrl()}/v1/companies`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (res.status === 201) {
      const company = (await res.json()) as { id: string; name: string; slug: string };
      return {
        ok: true,
        membership: {
          companyId: company.id,
          companyName: company.name,
          companySlug: company.slug,
          roleKey: "company_owner", // createCompanyWithOwner makes the caller the owner
        },
      };
    }
    if (res.status === 400) return { ok: false, error: "slug_taken" }; // "Company slug already taken"
    if (res.status === 422) return { ok: false, error: "invalid" };
    return { ok: false, error: "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}
