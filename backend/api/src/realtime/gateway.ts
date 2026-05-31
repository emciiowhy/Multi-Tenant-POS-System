import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { RevocationStore } from "@vendme/auth";
import { roomFor, socketSubscribeInput } from "@vendme/contracts";
import { env } from "../env.js";
import { socketAuth } from "./authenticate-socket.js";
import {
  authorizeBranch as defaultAuthorizeBranch,
  type BranchAuthorizer,
} from "./branch-access.js";
import { realtimeBus, type RealtimeBus } from "./bus.js";
import type { AppServer, AppSocket } from "./types.js";

/** Dedicated path so the WS endpoint can't collide with REST routes. */
export const SOCKET_PATH = "/realtime";

export interface GatewayDeps {
  /** Shared with the HTTP layer so a revoked sid is rejected on both. */
  revocations: RevocationStore;
  /** Injectable so the gateway is testable without a database. */
  authorizeBranch?: BranchAuthorizer;
  /** The domain-event source; defaults to the process-wide singleton. */
  bus?: RealtimeBus;
}

/**
 * Attaches the Socket.IO realtime gateway (ADR-0007) to an existing HTTP server
 * so it shares the Express port.
 *
 * The handshake middleware fixes the socket's `companyId` from the verified JWT
 * claim. Because every room name is built by {@link roomFor} with that claimed
 * companyId, a socket can only ever join rooms inside its own tenant — the
 * realtime analog of the RLS `app.company_id` boundary (ADR-0002). `subscribe`
 * lets a socket narrow to a specific Branch, which must pass `authorizeBranch`.
 */
export function createGateway(
  httpServer: HttpServer,
  {
    revocations,
    authorizeBranch = defaultAuthorizeBranch,
    bus = realtimeBus,
  }: GatewayDeps,
): AppServer {
  const io: AppServer = new Server(httpServer, {
    path: SOCKET_PATH,
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.use(socketAuth(revocations));

  // Translate committed domain events into tenant-scoped room broadcasts. The
  // room is derived from the message's companyId, so a delta can only ever
  // reach sockets inside its own tenant. Kitchen tickets target the KDS room;
  // everything else the branch room. Best-effort: a bad emit never propagates.
  bus.subscribe(({ companyId, branchId, event }) => {
    try {
      const room =
        event.type === "kitchen.ticket.updated"
          ? roomFor.kds(companyId, branchId)
          : roomFor.branch(companyId, branchId);
      io.to(room).emit("sync", event);
    } catch {
      /* realtime is best-effort; swallow */
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const { companyId, accountId } = socket.data;

    socket.on("subscribe", async (input, ack) => {
      const parsed = socketSubscribeInput.safeParse(input);
      if (!parsed.success) {
        ack({ ok: false, code: "invalid_input" });
        return;
      }
      const { branchId, kds } = parsed.data;

      let allowed: boolean;
      try {
        allowed = await authorizeBranch(companyId, accountId, branchId);
      } catch {
        ack({ ok: false, code: "error" });
        return;
      }
      if (!allowed) {
        ack({ ok: false, code: "forbidden_branch" });
        return;
      }

      // companyId comes from the claim, so these room names are tenant-locked.
      const rooms = [roomFor.branch(companyId, branchId)];
      if (kds) rooms.push(roomFor.kds(companyId, branchId));
      await socket.join(rooms);
      ack({ ok: true, rooms });
    });
  });

  return io;
}
