"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  signOut as nextAuthSignOut,
  useSession,
} from "next-auth/react";
import { useRouter } from "next/navigation";
import { buildSessionView, type RawMembership, type SessionView } from "@/lib/auth/session-view";

/**
 * App-level session bridge (UI/UX modernization, slice 06). Wraps NextAuth's
 * `SessionProvider` and re-exposes the session as a clean view-model
 * ({@link SessionView}) plus the two mutations the header needs:
 *
 * - `switchCompany` — re-mints the access token for the chosen Company by
 *   calling `useSession().update({ activeCompanyId })` (the NextAuth `jwt`
 *   callback validates membership, ADR-0001/0004), then `router.refresh()` so the
 *   server `(dashboard)` layout re-resolves role/permissions for the new company.
 * - `signOut` — delegates to NextAuth.
 *
 * Components depend on {@link useAppSession} (this context), never on
 * `next-auth/react` directly, so this file is the single seam onto next-auth and
 * the components stay trivially testable.
 */
export interface AppSession extends SessionView {
  switchCompany: (companyId: string) => Promise<void>;
  /** Fold a freshly-created tenant into the session and make it active
   *  (onboarding, PRD §2.3) — no re-login needed. */
  addCompany: (membership: RawMembership) => Promise<void>;
  signOut: () => void;
}

const DEFAULT_APP_SESSION: AppSession = {
  status: "loading",
  account: null,
  activeCompany: null,
  companies: [],
  enabledModules: {},
  switchCompany: async () => {},
  addCompany: async () => {},
  signOut: () => {},
};

const AppSessionContext = createContext<AppSession | null>(null);

export function SessionProvider({
  children,
  enabledModules,
}: {
  children: ReactNode;
  /** Active-company module flags, injected so the view-model can gate modules. */
  enabledModules?: Record<string, boolean>;
}) {
  return (
    <NextAuthSessionProvider>
      <AppSessionBridge enabledModules={enabledModules}>{children}</AppSessionBridge>
    </NextAuthSessionProvider>
  );
}

function AppSessionBridge({
  children,
  enabledModules,
}: {
  children: ReactNode;
  enabledModules?: Record<string, boolean>;
}) {
  const { data, status, update } = useSession();
  const router = useRouter();

  const value = useMemo<AppSession>(() => {
    const view = buildSessionView({ status, session: data }, { enabledModules });
    return {
      ...view,
      switchCompany: async (companyId: string) => {
        await update({ activeCompanyId: companyId });
        router.refresh();
      },
      addCompany: async (membership: RawMembership) => {
        await update({ newMembership: membership });
        router.refresh();
      },
      signOut: () => {
        void nextAuthSignOut();
      },
    };
  }, [data, status, enabledModules, update, router]);

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

/** Reads the app session view-model. Returns a safe loading default when used
 *  outside a {@link SessionProvider} (e.g. unit tests of unrelated shell parts). */
export function useAppSession(): AppSession {
  return useContext(AppSessionContext) ?? DEFAULT_APP_SESSION;
}
