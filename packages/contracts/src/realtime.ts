import { z } from "zod";
import { uuid } from "./common.js";
import { kdsStatus, tableStatus } from "./restaurant.js";

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
    status: kdsStatus,
  }),
  z.object({
    type: z.literal("table.changed"),
    tableId: uuid,
    status: tableStatus,
  }),
]);
export type RealtimeEvent = z.infer<typeof realtimeEvent>;

export const roomFor = {
  branch: (companyId: string, branchId: string) =>
    `company:${companyId}:branch:${branchId}`,
  kds: (companyId: string, branchId: string) =>
    `company:${companyId}:kds:${branchId}`,
};

/**
 * Client→server: a request to subscribe to a Branch's realtime rooms over an
 * already-authenticated socket (ADR-0007). The companyId is NEVER part of this
 * payload — it comes only from the verified JWT claim on the connection, so a
 * client can never name another tenant's rooms. The server validates that
 * `branchId` is reachable under the connection's company before joining.
 */
export const socketSubscribeInput = z.object({
  branchId: uuid,
  /** Also join the Kitchen Display room for this branch (restaurant vertical). */
  kds: z.boolean().optional(),
});
export type SocketSubscribeInput = z.infer<typeof socketSubscribeInput>;

/** Server→client ack for a {@link socketSubscribeInput} request. */
export const socketSubscribeResult = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), rooms: z.array(z.string()) }),
  z.object({
    ok: z.literal(false),
    code: z.enum(["invalid_input", "forbidden_branch", "error"]),
  }),
]);
export type SocketSubscribeResult = z.infer<typeof socketSubscribeResult>;

/** Reasons a handshake is refused; surfaced as the connect_error message. */
export const SOCKET_AUTH_ERRORS = {
  missingToken: "missing_token",
  invalidToken: "invalid_token",
  revoked: "revoked",
} as const;
export type SocketAuthError =
  (typeof SOCKET_AUTH_ERRORS)[keyof typeof SOCKET_AUTH_ERRORS];
