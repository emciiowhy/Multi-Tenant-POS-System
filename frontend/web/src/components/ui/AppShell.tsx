"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navItemsFor } from "@/lib/shell/nav-model";
import { branchIdFromPath } from "@/lib/shell/branch-path";
import { useSidebarStore } from "@/lib/shell/sidebar-store";
import { cn } from "@/lib/ui/cn";
import { Sidebar } from "./Sidebar";
import { TenantSwitcher } from "@/components/auth/TenantSwitcher";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { OfflineIndicator, BillingBannerSlot } from "./Interceptors";

/** Identity/permission context resolved by the server layout (plain data — the
 *  client never imports the auth package). */
export interface AppShellNavContext {
  role: string;
  /** Resolved permission keys; `"*"` means superuser. */
  permissions: string[];
  enabledModules: Record<string, boolean>;
}

/**
 * The dashboard shell (slice 05): a fixed sidebar on desktop and an off-canvas
 * drawer on mobile, plus a header. Nav content is computed from the server-supplied
 * permission context + the branch derived from the URL (the only route detail the
 * layout can't see). Collapse state is persisted; the drawer is local.
 */
export function AppShell({
  navContext,
  children,
}: {
  navContext: AppShellNavContext;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const branchId = branchIdFromPath(pathname);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapse = useSidebarStore((s) => s.toggle);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSuper = navContext.permissions.includes("*");
  const can = (_role: string, permission: string) =>
    isSuper || navContext.permissions.includes(permission);
  const items = navItemsFor(
    { role: navContext.role, enabledModules: navContext.enabledModules, branchId },
    can,
  );

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="flex min-h-screen bg-surface-2 text-fg">
      {drawerOpen && (
        <div
          data-testid="drawer-backdrop"
          onClick={closeDrawer}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        data-testid="app-sidebar"
        data-state={drawerOpen ? "open" : "closed"}
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Sidebar
          items={items}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onNavigate={closeDrawer}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 md:hidden"
          >
            <span aria-hidden>☰</span>
          </button>
          <span className="font-semibold md:hidden">VendMe</span>
          {/* OfflineIndicator + tenant switcher + profile (slices 06/07) read the
              session/interceptor contexts. */}
          <div className="ml-auto flex items-center gap-2" data-testid="header-actions">
            <OfflineIndicator />
            <TenantSwitcher />
            <ProfileMenu />
          </div>
        </header>
        {/* Reserved billing-banner slot (slice 07): a flow element that pushes the
            content down rather than overlaying it. */}
        <BillingBannerSlot />
        {/* A div (not <main>) for now: migrated pages still own their <main>
            landmark; slice 09 reconciles page chrome onto the shell. */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
