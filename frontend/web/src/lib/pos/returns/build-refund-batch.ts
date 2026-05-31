import type { PosEvent } from "@vendme/contracts";

export interface RefundBatch {
  /** Batch id — the Outbox dedupe key. */
  id: string;
  kind: "pos.refund";
  events: PosEvent[];
  orderClientUuid: string;
}

/**
 * Builds the idempotent batch for a refund: a single `order.refund` event
 * against an existing order. Like a sale, the client_uuid is generated up front
 * and persisted so an offline replay is a safe no-op on retry (ADR-0006); the
 * refund itself is a compensating event, never a mutation (ADR-0009).
 */
export function buildRefundBatch(input: {
  orderClientUuid: string;
  amount: string;
  uuid?: () => string;
}): RefundBatch {
  const gen = input.uuid ?? (() => crypto.randomUUID());
  const id = gen();
  const events: PosEvent[] = [
    {
      type: "order.refund",
      clientUuid: gen(),
      orderClientUuid: input.orderClientUuid,
      amount: input.amount,
    },
  ];
  return { id, kind: "pos.refund", events, orderClientUuid: input.orderClientUuid };
}
