/**
 * Pure status → Badge variant mapping (UI/UX modernization, slice 03). Folds the
 * many system statuses (subscription, outbox/transaction, shift, KDS ticket,
 * table) onto a small token-backed set. Total and safe: unknown/empty statuses
 * degrade to `neutral` (slate), never to an alarming colour, and it never throws.
 */

export type BadgeVariant = "neutral" | "success" | "warning" | "danger";

const BY_STATUS: Record<string, BadgeVariant> = {
  // healthy / entitled / completed → success (emerald)
  active: "success",
  trialing: "success",
  applied: "success",
  ready: "success",
  open: "success",
  paid: "success",
  confirmed: "success",
  completed: "success",
  // in progress / needs attention → warning (amber)
  past_due: "warning",
  pending: "warning",
  preparing: "warning",
  processing: "warning",
  // failed / blocked / lapsed → danger (red)
  canceled: "danger",
  cancelled: "danger",
  unpaid: "danger",
  incomplete: "danger",
  failed: "danger",
  rejected: "danger",
  overdue: "danger",
  // terminal / idle → neutral (slate)
  closed: "neutral",
  served: "neutral",
  free: "neutral",
  draft: "neutral",
};

export function badgeVariant(status: string): BadgeVariant {
  if (!status) return "neutral";
  return BY_STATUS[status.toLowerCase()] ?? "neutral";
}
