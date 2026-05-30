import { z } from "zod";
import { money, uuid } from "./common.js";

export const orderLineInput = z.object({
  productId: uuid,
  variantId: uuid.optional(),
  quantity: money,
  modifiers: z.array(z.record(z.unknown())).optional(),
});

/**
 * A batch of POS events emitted by a terminal (possibly after being offline).
 * Each event carries a clientUuid so the server can replay idempotently
 * (ADR-0006). The server assigns ordering on accept.
 */
export const posEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("order.open"),
    clientUuid: uuid,
    orderClientUuid: uuid,
    branchId: uuid,
    registerId: uuid.optional(),
    tableId: uuid.optional(),
  }),
  z.object({
    type: z.literal("order.fire"),
    clientUuid: uuid,
    orderClientUuid: uuid,
    lines: z.array(orderLineInput).min(1),
  }),
  z.object({
    type: z.literal("order.settle"),
    clientUuid: uuid,
    orderClientUuid: uuid,
    tenders: z
      .array(
        z.object({
          method: z.enum([
            "cash",
            "card",
            "bank_transfer",
            "cheque",
            "gift_card",
            "loyalty",
          ]),
          amount: money,
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("order.refund"),
    clientUuid: uuid,
    orderClientUuid: uuid,
    amount: money,
  }),
]);
export type PosEvent = z.infer<typeof posEvent>;

export const posEventBatch = z.object({ events: z.array(posEvent).min(1) });
export type PosEventBatch = z.infer<typeof posEventBatch>;

export const posEventResult = z.object({
  clientUuid: uuid,
  status: z.enum(["applied", "duplicate", "rejected"]),
  orderId: uuid.optional(),
  reason: z.string().optional(),
});
export type PosEventResult = z.infer<typeof posEventResult>;
