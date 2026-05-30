import { z } from "zod";
import { uuid } from "./common.js";

/** Server→client realtime events broadcast over Socket.IO (ADR-0007). */
export const realtimeEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("order.fired"),
    orderId: uuid,
    branchId: uuid,
  }),
  z.object({
    type: z.literal("stock.changed"),
    stockItemId: uuid,
    onHand: z.string(),
  }),
  z.object({
    type: z.literal("shift.opened"),
    shiftId: uuid,
    registerId: uuid,
  }),
  z.object({
    type: z.literal("shift.closed"),
    shiftId: uuid,
    registerId: uuid,
  }),
  z.object({
    type: z.literal("kitchen.ticket.updated"),
    ticketId: uuid,
    status: z.enum(["queued", "preparing", "ready", "served"]),
  }),
]);
export type RealtimeEvent = z.infer<typeof realtimeEvent>;

export const roomFor = {
  branch: (companyId: string, branchId: string) =>
    `company:${companyId}:branch:${branchId}`,
  kds: (companyId: string, branchId: string) =>
    `company:${companyId}:kds:${branchId}`,
};
