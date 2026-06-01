"use client";

import { useState } from "react";
import { useAppSession } from "./SessionProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/ui/cn";

/**
 * Header company switcher (slice 06). Lists the account's memberships, marks the
 * active Company, and on select re-mints the access token via the session
 * bridge ({@link useAppSession}.switchCompany → NextAuth `update`). The active
 * Company is the tenancy boundary, so switching re-scopes every later API call.
 */
export function TenantSwitcher() {
  const { status, companies, activeCompany, switchCompany } = useAppSession();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (status === "loading") {
    return <Skeleton data-testid="tenant-switcher-skeleton" className="h-9 w-40" />;
  }
  if (companies.length === 0) return null;

  async function select(companyId: string) {
    setOpen(false);
    if (companyId === activeCompany?.id) return;
    setSwitching(true);
    try {
      await switchCompany(companyId);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="tenant-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={switching}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[14rem] items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-60"
      >
        <span className="truncate">{activeCompany?.name ?? "Select company"}</span>
        <span aria-hidden className="text-fg-muted">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Switch company"
          className="absolute left-0 z-50 mt-1 min-w-[15rem] rounded-card border border-border bg-surface p-1 shadow-card"
        >
          {companies.map((c) => {
            const active = c.id === activeCompany?.id;
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => void select(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-60",
                    active ? "font-medium text-fg" : "text-fg-muted",
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{c.name}</span>
                    <span className="truncate text-xs text-fg-muted">{c.role}</span>
                  </span>
                  {active && (
                    <span aria-hidden className="text-brand">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
