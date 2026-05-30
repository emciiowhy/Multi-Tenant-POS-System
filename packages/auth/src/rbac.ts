/**
 * RBAC (ADR-0005 scope). Permissions are `module:resource:action` strings.
 * Roles are bundles of permissions with single-parent inheritance. The catalogue
 * here is the source of truth seeded into the `permissions`/`roles` tables.
 */

export const PERMISSIONS = [
  // POS
  "pos:order:create",
  "pos:order:fire",
  "pos:order:settle",
  "pos:order:refund",
  "pos:shift:open",
  "pos:shift:close",
  "pos:drawer:manage",
  // Inventory
  "inventory:product:read",
  "inventory:product:write",
  "inventory:stock:adjust",
  "inventory:recipe:write",
  // Accounting (posting-only in v1)
  "accounting:ledger:read",
  "accounting:chart:write",
  // Restaurant
  "restaurant:table:manage",
  "restaurant:kds:operate",
  // HR (stubbed module, perms reserved)
  "hr:employee:read",
  "hr:payroll:run",
  // Platform / admin
  "company:settings:write",
  "company:member:manage",
  "company:role:manage",
  "billing:subscription:manage",
  "audit:log:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const WILDCARD = "*" as const;

export interface RoleDef {
  key: string;
  name: string;
  inherits?: string;
  /** Explicit grants; `["*"]` means all permissions (Super Admin only). */
  permissions: (Permission | typeof WILDCARD)[];
}

/** 15+ system roles. Inheritance keeps the definitions DRY. */
export const SYSTEM_ROLES: RoleDef[] = [
  { key: "super_admin", name: "Super Admin", permissions: [WILDCARD] },
  {
    key: "company_owner",
    name: "Company Owner",
    permissions: [
      "company:settings:write",
      "company:member:manage",
      "company:role:manage",
      "billing:subscription:manage",
      "audit:log:read",
      "accounting:ledger:read",
      "accounting:chart:write",
      "inventory:product:write",
      "inventory:recipe:write",
      "inventory:stock:adjust",
      "pos:order:refund",
    ],
  },
  {
    key: "branch_manager",
    name: "Branch Manager",
    inherits: "supervisor",
    permissions: [
      "inventory:product:write",
      "inventory:stock:adjust",
      "restaurant:table:manage",
      "pos:order:refund",
    ],
  },
  {
    key: "supervisor",
    name: "Supervisor",
    inherits: "cashier",
    permissions: ["pos:shift:open", "pos:shift:close", "pos:drawer:manage"],
  },
  {
    key: "cashier",
    name: "Cashier",
    permissions: [
      "pos:order:create",
      "pos:order:fire",
      "pos:order:settle",
      "inventory:product:read",
    ],
  },
  {
    key: "accountant",
    name: "Accountant",
    permissions: ["accounting:ledger:read", "accounting:chart:write", "audit:log:read"],
  },
  {
    key: "finance_officer",
    name: "Finance Officer",
    inherits: "accountant",
    permissions: ["billing:subscription:manage"],
  },
  {
    key: "auditor",
    name: "Auditor",
    permissions: ["audit:log:read", "accounting:ledger:read", "inventory:product:read"],
  },
  {
    key: "hr_manager",
    name: "HR Manager",
    permissions: ["hr:employee:read", "hr:payroll:run"],
  },
  {
    key: "inventory_clerk",
    name: "Inventory Clerk",
    permissions: ["inventory:product:read", "inventory:product:write", "inventory:stock:adjust"],
  },
  {
    key: "sales_agent",
    name: "Sales Agent",
    inherits: "cashier",
    permissions: [],
  },
  {
    key: "waiter",
    name: "Waiter",
    permissions: [
      "pos:order:create",
      "pos:order:fire",
      "restaurant:table:manage",
      "inventory:product:read",
    ],
  },
  {
    key: "kitchen_staff",
    name: "Kitchen Staff",
    permissions: ["restaurant:kds:operate"],
  },
  {
    key: "mechanic",
    name: "Mechanic",
    permissions: ["inventory:product:read"],
  },
  {
    key: "customer_support",
    name: "Customer Support",
    permissions: ["inventory:product:read", "audit:log:read"],
  },
];

const roleIndex = new Map(SYSTEM_ROLES.map((r) => [r.key, r]));

/** Resolves a role's full permission set, following inheritance. */
export function resolvePermissions(roleKey: string): Set<string> {
  const out = new Set<string>();
  let current = roleIndex.get(roleKey);
  const guard = new Set<string>();
  while (current && !guard.has(current.key)) {
    guard.add(current.key);
    for (const p of current.permissions) out.add(p);
    current = current.inherits ? roleIndex.get(current.inherits) : undefined;
  }
  return out;
}

/** The policy check used by API middleware and re-checked in services. */
export function can(roleKey: string, permission: Permission): boolean {
  const perms = resolvePermissions(roleKey);
  return perms.has(WILDCARD) || perms.has(permission);
}
