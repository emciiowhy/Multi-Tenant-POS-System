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
  return statusOf(err) === 401;
}

/** A subscription-gate block (ADR-0005): the API returned 402. Neither a
 * transport failure (don't back off forever) nor a per-event rejection (don't
 * fail the batch) — stop draining and send the user to billing; the queue stays. */
export function isBillingError(err: unknown): boolean {
  return statusOf(err) === 402;
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null
    ? (err as { status?: number }).status
    : undefined;
}
