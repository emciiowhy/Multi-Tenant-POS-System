/**
 * Pure action-lock resolver (UI/UX modernization, slice 07). Maps the billing
 * banner state to a shell-wide soft-lock for *gated* actions (checkout, refunds,
 * shift ops): when the subscription is hard-inactive the cashier can still read
 * the app, but money-moving buttons freeze with a reason rather than failing at
 * the server with a 402. This is the soft-lock counterpart to the hard 402 →
 * `/billing` redirect (ADR-0012); it feeds the `Button` `blockedReason` contract
 * (slice 02).
 *
 * Note on offline: the POS is offline-first (sales queue locally and replay), so
 * connectivity deliberately does NOT lock checkout — it surfaces via the
 * non-blocking `OfflineIndicator` instead. Only the subscription lockout is a
 * critical, action-freezing state.
 */

import type { BannerState } from "@/lib/billing/banner-logic";

export interface ActionLockInput {
  /** The billing banner kind for the active company (see {@link BannerState}). */
  banner: BannerState["kind"];
}

export interface ActionLock {
  locked: boolean;
  /** Human reason for the soft-lock, or null when actions are live. */
  reason: string | null;
}

/** Banner kinds that hard-freeze gated actions (vs. `trial_ending`, a nudge). */
const LOCKING_KINDS = new Set<BannerState["kind"]>(["trial_expired", "past_due", "blocked"]);

export function resolveActionLock(input: ActionLockInput): ActionLock {
  if (LOCKING_KINDS.has(input.banner)) {
    return { locked: true, reason: "Subscription inactive — update billing to continue." };
  }
  return { locked: false, reason: null };
}
