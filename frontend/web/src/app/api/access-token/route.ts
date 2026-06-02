import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mintAccessToken } from "@/lib/access-token";

// Session- and key-dependent; always rendered per request.
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived access token scoped to the session's active company.
 * The browser calls this, then sends the token as a Bearer credential to the
 * Express backend. Re-called after a company switch to get a re-scoped token.
 */
export async function GET() {
  const session = await auth();
  if (!session?.accountId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const active = session.memberships.find((m) => m.companyId === session.activeCompanyId);
  if (!active) {
    return NextResponse.json({ error: "no_active_company" }, { status: 409 });
  }

  const token = await mintAccessToken({
    accountId: session.accountId,
    companyId: active.companyId,
    role: active.roleKey,
    sid: session.sid,
  });
  return NextResponse.json({ accessToken: token, company: active });
}
