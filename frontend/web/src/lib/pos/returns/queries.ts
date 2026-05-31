"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getOutbox } from "../outbox";
import { getReplayEngine } from "../replay";
import { buildRefundBatch } from "./build-refund-batch";

export interface RecentOrder {
  id: string;
  clientUuid: string;
  status: string;
  grandTotal: string;
  settledAt: string | null;
  createdAt: string;
}

export function useRecentOrders(branchId: string) {
  return useQuery({
    queryKey: ["recent-orders", branchId],
    queryFn: () => apiFetch<RecentOrder[]>(`/v1/pos/orders?branchId=${branchId}`),
  });
}

export interface RefundResult {
  id: string;
  synced: boolean;
}

/**
 * Refunds an order through the same offline-safe path as a sale: the
 * `order.refund` batch is queued in the outbox and drained by the replay engine
 * (idempotent via client_uuid). `flushNow` attempts an immediate sync.
 */
export function useRefund() {
  const [pending, setPending] = useState(false);

  async function refund(orderClientUuid: string, amount: string): Promise<RefundResult> {
    setPending(true);
    try {
      const batch = buildRefundBatch({ orderClientUuid, amount });
      const outbox = getOutbox();
      await outbox.enqueue(batch);
      await getReplayEngine().flushNow();
      const entry = outbox.all().find((e) => e.id === batch.id);
      return { id: batch.id, synced: entry?.status === "applied" };
    } finally {
      setPending(false);
    }
  }

  return { refund, pending };
}
