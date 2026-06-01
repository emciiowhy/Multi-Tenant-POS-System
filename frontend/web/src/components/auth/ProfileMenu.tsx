"use client";

import { useState } from "react";
import { useAppSession } from "./SessionProvider";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Header profile menu (slice 06). Shows an avatar (image, else initials) and, on
 * open, the account, the active Company, and a sign-out action. Reads everything
 * from the session bridge ({@link useAppSession}); sign-out delegates to NextAuth.
 */
export function ProfileMenu() {
  const { status, account, activeCompany, signOut } = useAppSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <Skeleton data-testid="profile-skeleton" className="size-9 rounded-full" />;
  }
  if (!account) return null;

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${account.name}`}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-brand-foreground"
      >
        {account.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar, not a layout image
          <img
            data-testid="profile-avatar"
            src={account.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span data-testid="profile-initials">{account.initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-1 min-w-[15rem] rounded-card border border-border bg-surface p-2 shadow-card"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-fg">{account.name}</p>
            {account.email && <p className="truncate text-xs text-fg-muted">{account.email}</p>}
            {activeCompany && (
              <p className="mt-1 truncate text-xs text-fg-muted">
                Active: <span className="text-fg">{activeCompany.name}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut()}
            className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-danger hover:bg-danger-bg"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
