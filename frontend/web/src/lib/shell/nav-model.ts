/**
 * Pure navigation model (UI/UX modernization, slice 04). Given the active
 * Company/user context, produces the ordered sidebar items. Two gates: the
 * `restaurant` items appear only when that module is enabled (mirrors the
 * backend module seam, ADR-0005); permission-gated items appear only when the
 * injected `can` predicate allows them. The permission check is injected (not
 * imported) so this stays dependency-free + unit-testable, and so the client
 * shell never bundles server-only auth code — the shell supplies the real `can`.
 *
 * Branch-scoped destinations (`/pos/:branch`, …) need the active branch; without
 * one they're omitted rather than linking to a broken path.
 */

export type CanFn = (role: string, permission: string) => boolean;

export interface NavContext {
  role: string;
  enabledModules?: Record<string, boolean> | null;
  /** Active branch for branch-scoped destinations. */
  branchId?: string | null;
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

interface NavSpec {
  key: string;
  label: string;
  branchScoped: boolean;
  permission?: string;
  module?: string;
  href: (branchId: string) => string;
}

const SPECS: NavSpec[] = [
  {
    key: "pos",
    label: "Register",
    branchScoped: true,
    permission: "pos:order:create",
    href: (b) => `/pos/${b}`,
  },
  {
    key: "shifts",
    label: "Shifts",
    branchScoped: true,
    permission: "pos:shift:open",
    href: (b) => `/shifts/${b}`,
  },
  {
    key: "returns",
    label: "Returns",
    branchScoped: true,
    permission: "pos:order:refund",
    href: (b) => `/returns/${b}`,
  },
  {
    key: "catalog",
    label: "Catalog",
    branchScoped: true,
    permission: "inventory:product:read",
    href: (b) => `/catalog/${b}`,
  },
  {
    key: "inventory",
    label: "Inventory",
    branchScoped: true,
    permission: "inventory:product:read",
    href: (b) => `/inventory/${b}`,
  },
  {
    key: "floor",
    label: "Floor",
    branchScoped: true,
    permission: "restaurant:table:manage",
    module: "restaurant",
    href: (b) => `/restaurant/floor/${b}`,
  },
  {
    key: "kds",
    label: "Kitchen",
    branchScoped: true,
    permission: "restaurant:kds:operate",
    module: "restaurant",
    href: (b) => `/restaurant/kds/${b}`,
  },
  // Billing is open to any member (read), so it carries no permission gate and is
  // not branch-scoped — it always shows.
  { key: "billing", label: "Billing", branchScoped: false, href: () => "/billing" },
];

export function navItemsFor(ctx: NavContext, can: CanFn): NavItem[] {
  const modules = ctx.enabledModules ?? {};
  const items: NavItem[] = [];
  for (const spec of SPECS) {
    if (spec.module && !modules[spec.module]) continue;
    if (spec.permission && !can(ctx.role, spec.permission)) continue;
    if (spec.branchScoped) {
      if (!ctx.branchId) continue;
      items.push({ key: spec.key, label: spec.label, href: spec.href(ctx.branchId) });
    } else {
      items.push({ key: spec.key, label: spec.label, href: spec.href("") });
    }
  }
  return items;
}
