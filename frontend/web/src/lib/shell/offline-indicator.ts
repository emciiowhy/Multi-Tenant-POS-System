/**
 * Maps connectivity + durable-outbox depth (ADR-0013) to a deterministic UI
 * state for the header indicator (UI/UX modernization, slice 04):
 *   - offline           → "offline" (warning), carrying the queued count
 *   - online, queue > 0 → "queued"  (warning), syncing those now
 *   - online, queue = 0 → "online"  (neutral), all synced
 * The count is sanitized to a non-negative integer so the component renders
 * deterministically regardless of upstream noise.
 */

export type OfflineIndicatorKind = "online" | "queued" | "offline";

export interface OfflineIndicatorState {
  kind: OfflineIndicatorKind;
  count: number;
  tone: "neutral" | "warning";
}

export function offlineIndicatorState(input: {
  online: boolean;
  pendingCount: number;
}): OfflineIndicatorState {
  const count = Math.max(0, Math.trunc(input.pendingCount) || 0);
  if (!input.online) return { kind: "offline", count, tone: "warning" };
  if (count > 0) return { kind: "queued", count, tone: "warning" };
  return { kind: "online", count: 0, tone: "neutral" };
}
