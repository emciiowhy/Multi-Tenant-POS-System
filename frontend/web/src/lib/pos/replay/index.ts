import { onlineManager } from "@tanstack/react-query";
import type { PosEvent, PosEventResult } from "@vendme/contracts";
import { apiFetch } from "@/lib/api";
import { notifyBillingRequired } from "@/lib/billing/billing-redirect";
import { getOutbox } from "../outbox";
import { ReplayEngine } from "./replay-engine";

export { ReplayEngine } from "./replay-engine";

async function submit(events: PosEvent[]): Promise<PosEventResult[]> {
  const { results } = await apiFetch<{ results: PosEventResult[] }>("/v1/pos/events", {
    method: "POST",
    body: JSON.stringify({ events }),
  });
  return results;
}

let engine: ReplayEngine | null = null;

/**
 * Process-wide ReplayEngine singleton, wired to the browser Outbox, the real
 * POS-events endpoint, and TanStack Query's `onlineManager` for reconnect
 * detection. A dead session (still 401 after apiFetch's re-mint) sends the
 * cashier to re-login; a subscription block (402) sends them to billing
 * (ADR-0005); in both cases the queue stays in IndexedDB and replays once the
 * block is resolved (idempotent via client_uuid). Browser-only.
 */
export function getReplayEngine(): ReplayEngine {
  if (!engine) {
    engine = new ReplayEngine({
      outbox: getOutbox(),
      submit,
      online: {
        isOnline: () => onlineManager.isOnline(),
        subscribe: (onChange) => onlineManager.subscribe(() => onChange()),
      },
      onAuthError: () => {
        if (typeof window !== "undefined") window.location.assign("/login");
      },
      // apiFetch already fires this on the 402, but signalling here keeps the
      // engine self-sufficient regardless of how `submit` is wired. Idempotent —
      // the BillingRedirect listener no-ops if already on /billing.
      onBillingRequired: () => notifyBillingRequired("subscription_required"),
    });
  }
  return engine;
}
