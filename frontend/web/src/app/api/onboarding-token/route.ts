import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mintOnboardingToken } from "@/lib/access-token";

// Session- and key-dependent; always rendered per request.
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived ACCOUNT-scoped token (no `company` claim) for the current
 * session, so a tenant-less account can create its first company via
 * `POST /v1/companies` (PRD §2.3). Unlike `/api/access-token`, this does NOT
 * require an active company — it's the bootstrap out of the zero-membership 409.
 * The backend's `authenticateAccount` guard accepts it only for company creation.
 */
export async function GET() {
  const session = await auth();
  if (!session?.accountId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const token = await mintOnboardingToken({
    accountId: session.accountId,
    sid: session.sid,
  });
  return NextResponse.json({ accessToken: token });
}
