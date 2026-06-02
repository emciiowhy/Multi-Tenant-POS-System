"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBranches } from "@/lib/branches/queries";
import { DataGridCard } from "@/components/ui/DataGridCard";

/**
 * Dashboard home / entry point. The authenticated routes are branch-scoped
 * (`/pos/:branch`, …), so a returning user needs a branch context before the
 * shell sidebar can populate. This page resolves that:
 *   - exactly one branch → drop straight into its Register (no needless click);
 *   - several branches    → a picker to choose which location to manage;
 *   - none yet            → a clear empty state.
 *
 * It's the target of `DASHBOARD_HOME` (post-sign-in + "Go to dashboard"), so the
 * old land-on-/billing behaviour is gone.
 */
export default function DashboardHomePage() {
  const router = useRouter();
  const { data: branches, isLoading, error } = useBranches();

  const list = branches ?? [];
  const only = list.length === 1 ? list[0] : null;

  // Single branch → skip the picker and go straight to its register.
  useEffect(() => {
    if (only) router.replace(`/pos/${only.id}`);
  }, [only, router]);

  if (isLoading) return <Centered>Loading your workspace…</Centered>;
  if (error) {
    return <Centered>Couldn’t load branches: {(error as Error).message}</Centered>;
  }
  if (only) return <Centered>Opening {only.name}…</Centered>;
  if (list.length === 0) {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-fg">No branches yet.</p>
          <p className="mt-1 text-sm text-fg-muted">Create a branch to start selling.</p>
        </div>
      </Centered>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-fg">Choose a branch</h1>
        <p className="text-sm text-fg-muted">Select which location you want to manage.</p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <DataGridCard
            key={b.id}
            onClick={() => router.push(`/pos/${b.id}`)}
            className="h-24 justify-between"
          >
            <span className="font-medium text-fg">{b.name}</span>
            <span className="text-sm text-fg-muted">{b.timezone}</span>
          </DataGridCard>
        ))}
      </div>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-fg-muted">
      {children}
    </div>
  );
}
