"use server";

import { auth } from "@/auth";

/**
 * Switches the active Company for the current session. Validation that the
 * account actually belongs to the target company happens in the NextAuth `jwt`
 * callback (it only accepts an activeCompanyId present in the session's
 * memberships), after which the next /api/access-token call re-mints a token
 * carrying the new `company` claim (ADR-0001/0004).
 *
 * NOTE: this returns the membership; the client should call `update()` from
 * `useSession` with the new activeCompanyId to propagate it into the JWT.
 */
export async function getSwitchableCompanies() {
  const session = await auth();
  return session?.memberships ?? [];
}
