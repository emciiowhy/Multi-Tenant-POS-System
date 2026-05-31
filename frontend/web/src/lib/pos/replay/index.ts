import { onlineManager } from "@tanstack/react-query";
import type { PosEvent, PosEventResult } from "@vendme/contracts";
import { apiFetch } from "@/lib/api";
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
 * cashier to re-login; the queue stays in IndexedDB. Browser-only.
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
    });
  }
  return engine;
}
