import type { PosEventResult } from "@vendme/contracts";

/** Outcome of submitting one batch: applied (every event applied/duplicate) or
 * a business rejection carrying its reason. */
export type ReplayOutcome = "applied" | { rejected: string };

/**
 * Interpret the server's per-event results. `duplicate` counts as success — a
 * prior attempt already reached the server, so an idempotent replay must not
 * double-apply (ADR-0006). Any `rejected` event fails the whole batch.
 */
export function classifyResults(results: PosEventResult[]): ReplayOutcome {
  const rejected = results.find((r) => r.status === "rejected");
  if (rejected) return { rejected: rejected.reason ?? "rejected" };
  return "applied";
}

/** Capped exponential backoff for transport failures. attempts is 1-based. */
export function backoffDelay(attempts: number, baseMs = 1000, capMs = 60000): number {
  const grown = baseMs * 2 ** Math.max(0, attempts - 1);
  return Math.min(capMs, grown);
}

/** A dead-session signal: the API still returned 401 after the transparent
 * token re-mint in apiFetch, so re-login is required. */
export function isAuthError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { status?: number }).status === 401
  );
}
