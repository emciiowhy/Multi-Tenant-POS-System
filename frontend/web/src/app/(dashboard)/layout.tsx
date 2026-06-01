import type { ReactNode } from "react";
import { resolvePermissions } from "@vendme/auth";
import { auth } from "@/auth";
import { AppShell } from "@/components/ui/AppShell";
import { InterceptorProvider } from "@/components/ui/Interceptors";

/**
 * Dashboard route group layout (UI/UX modernization, slice 05). Wraps the
 * authenticated workspace flows (POS, shifts, returns, restaurant, billing) in
 * the shell; `/` (landing) and `/login` stay outside the group. Route groups
 * don't change the URL, so every existing path is preserved.
 *
 * Identity → nav: resolve the active company's role and its permission set
 * server-side (the auth package is server-only here, never bundled to the
 * client), and hand the shell plain data. The branch + module context the nav
 * also needs is derived client-side from the URL (branch) — enabledModules is
 * not yet in the session, so restaurant nav items await that wiring (slice 06).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role =
    session?.memberships.find((m) => m.companyId === session.activeCompanyId)?.roleKey ?? "";
  const permissions = role ? [...resolvePermissions(role)] : [];

  return (
    // InterceptorProvider (slice 07) wraps the shell so the header indicator, the
    // banner slot, and page actions share one subscription/connectivity read; it
    // sits above AppShell (which stays QueryClient-free for its unit tests).
    <InterceptorProvider>
      <AppShell navContext={{ role, permissions, enabledModules: {} }}>{children}</AppShell>
    </InterceptorProvider>
  );
}
