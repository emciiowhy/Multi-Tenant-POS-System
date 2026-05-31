"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CartItem } from "./cart-logic";
import { buildSaleBatch, type TenderMethod } from "./build-sale-batch";
import { getOutbox, type OutboxStatus } from "./outbox";
import { getReplayEngine } from "./replay";

function subscribePending(onChange: () => void): () => void {
  return getOutbox().subscribe(() => onChange());
}
function pendingSnapshot(): number {
  return getOutbox().pendingCount();
}

/** Live count of sales not yet synced. SSR-safe (server snapshot is 0). */
export function useOutboxPending(): number {
  return useSyncExternalStore(subscribePending, pendingSnapshot, () => 0);
}

/** Live status (+ reason) of one outbox entry — drives the receipt's
 * provisional/confirmed/rejected state. */
export function useOutboxEntry(
  id: string | null,
): { status: OutboxStatus; reason?: string } | undefined {
  const [entry, setEntry] = useState<{ status: OutboxStatus; reason?: string } | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!id) {
      setEntry(undefined);
      return;
    }
    return getOutbox().subscribe((entries) => {
      const found = entries.find((e) => e.id === id);
      setEntry(found ? { status: found.status, reason: found.lastError } : undefined);
    });
  }, [id]);
  return entry;
}

/** Sales the server rejected on sync, for the attention banner. */
export function useOutboxFailed(): { id: string; reason: string }[] {
  const [failed, setFailed] = useState<{ id: string; reason: string }[]>([]);
  useEffect(
    () =>
      getOutbox().subscribe((entries) =>
        setFailed(
          entries
            .filter((e) => e.status === "failed")
            .map((e) => ({ id: e.id, reason: e.lastError ?? "rejected" })),
        ),
      ),
    [],
  );
  return failed;
}

/** Acknowledge (drop) a rejected sale. */
export function dismissSale(id: string): void {
  void getOutbox().remove(id);
}

/** Manually trigger a sync attempt now (e.g. a "retry sync" button). */
export function retrySync(): void {
  void getReplayEngine().flushNow();
}

export interface ChargeResult {
  /** Outbox batch id — used to track this sale's live status. */
  id: string;
  orderClientUuid: string;
  /** True if the sale reached the server and was applied during this charge. */
  synced: boolean;
}

/**
 * Charges a sale through the outbox: durably queued first, then drained by the
 * Replay engine (online/offline detection, idempotent replay, backoff).
 * `flushNow` attempts an immediate sync; offline, the sale stays queued and the
 * engine replays it on reconnect.
 */
export function useChargeSale(branchId: string) {
  const [pending, setPending] = useState(false);

  async function charge(
    items: CartItem[],
    tender: { method: TenderMethod; amount: string },
  ): Promise<ChargeResult> {
    setPending(true);
    try {
      const batch = buildSaleBatch({ branchId, items, tender });
      const outbox = getOutbox();
      await outbox.enqueue(batch);
      await getReplayEngine().flushNow();
      const entry = outbox.all().find((e) => e.id === batch.id);
      return {
        id: batch.id,
        orderClientUuid: batch.orderClientUuid,
        synced: entry?.status === "applied",
      };
    } finally {
      setPending(false);
    }
  }

  return { charge, pending };
}
