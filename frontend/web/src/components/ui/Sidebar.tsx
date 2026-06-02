"use client";

import Link from "next/link";
import type { NavItem } from "@/lib/shell/nav-model";
import { isActiveNav } from "@/lib/shell/nav-active";
import { cn } from "@/lib/ui/cn";

export interface SidebarProps {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Fired on link activation so the mobile drawer can close. */
  onNavigate?: () => void;
}

/**
 * Presentational sidebar (slice 05): renders the {@link NavItem}s with the active
 * link highlighted via {@link isActiveNav}, an expanded ↔ icon-rail collapse, and
 * a collapse toggle. No hooks — fully prop-driven so it's trivially testable; the
 * AppShell owns the state.
 */
export function Sidebar({
  items,
  pathname,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  return (
    <div
      data-testid="sidebar"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface p-2 transition-[width]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-10 items-center px-2", collapsed ? "justify-center" : "")}>
        <span className={cn("text-sm font-semibold", collapsed && "sr-only")}>VendMe</span>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActiveNav(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-2 font-medium text-fg"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                collapsed && "justify-center px-0"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded text-xs font-semibold uppercase",
                  active ? "bg-brand text-brand-foreground" : "bg-surface-2"
                )}
              >
                {item.label[0]}
              </span>
              <span className={cn(collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <span aria-hidden>{collapsed ? "»" : "«"}</span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </div>
  );
}
