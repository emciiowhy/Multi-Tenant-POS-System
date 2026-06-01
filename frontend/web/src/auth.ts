import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { serverEnv } from "@/lib/env";

// Web Crypto (available in both Node 22 and the edge/middleware runtime).
const newSid = () => globalThis.crypto.randomUUID();

interface Membership {
  companyId: string;
  companyName: string;
  companySlug: string;
  roleKey: string;
}

declare module "next-auth" {
  interface Session {
    accountId: string;
    sid: string;
    activeCompanyId: string | null;
    memberships: Membership[];
    user: DefaultSession["user"];
  }
}

/**
 * NextAuth v5. The credentials provider delegates password verification to the
 * backend (`/v1/auth/verify-credentials`). On success we capture the account's
 * memberships and mint a stable per-session `sid` (used for revocation,
 * ADR-0004). The active company defaults to the first membership and is changed
 * via the switch-company action, which re-mints the access token.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const email = String(raw?.email ?? "");
        const password = String(raw?.password ?? "");
        if (!email || !password) return null;

        const res = await fetch(`${serverEnv.apiUrl()}/v1/auth/verify-credentials`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          account: { id: string; email: string; displayName: string | null };
          memberships: Membership[];
        };
        return {
          id: data.account.id,
          email: data.account.email,
          name: data.account.displayName ?? data.account.email,
          memberships: data.memberships,
        } as never;
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user, trigger, session }) => {
      if (user) {
        const u = user as unknown as { id: string; memberships: Membership[] };
        token.accountId = u.id;
        token.sid = newSid();
        token.memberships = u.memberships;
        token.activeCompanyId = u.memberships[0]?.companyId ?? null;
      }
      // update() triggers: a company switch (`{ activeCompanyId }`) or a freshly
      // onboarded company (`{ newMembership }`, PRD §2.3) — the new membership
      // isn't in the login-time snapshot, so fold it in + activate it.
      if (trigger === "update" && session) {
        const memberships = (token.memberships as Membership[] | undefined) ?? [];
        const newMembership = (session as { newMembership?: Membership }).newMembership;
        if (newMembership?.companyId) {
          token.memberships = memberships.some((m) => m.companyId === newMembership.companyId)
            ? memberships
            : [...memberships, newMembership];
          token.activeCompanyId = newMembership.companyId;
        } else if (
          session.activeCompanyId &&
          memberships.some((m) => m.companyId === session.activeCompanyId)
        ) {
          token.activeCompanyId = session.activeCompanyId;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      session.accountId = token.accountId as string;
      session.sid = token.sid as string;
      session.activeCompanyId = (token.activeCompanyId as string | null) ?? null;
      session.memberships = (token.memberships as Membership[]) ?? [];
      return session;
    },
  },
});

export type { Membership };
