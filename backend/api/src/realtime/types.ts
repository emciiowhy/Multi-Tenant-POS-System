import type {
  Server as IOServer,
  Socket as IOSocket,
  DefaultEventsMap,
} from "socket.io";
import type {
  RealtimeEvent,
  SocketSubscribeInput,
  SocketSubscribeResult,
} from "@vendme/contracts";

/**
 * Server-trusted context attached to each socket once the handshake auth
 * middleware succeeds — the WebSocket analog of the HTTP {@link RequestContext}
 * (lib/context.ts). Every field is derived from the verified JWT claim, never
 * from anything the client asserts over the wire. In particular `companyId` is
 * the immutable tenant ceiling used to prefix every room the socket may join.
 */
export interface SocketContext {
  accountId: string;
  companyId: string;
  role: string;
  sid: string;
}

/** Events a client may emit to the server. */
export interface ClientToServerEvents {
  /**
   * Ask to join a Branch's realtime rooms. The server validates the branch is
   * reachable under this socket's company before joining (see branch-access).
   */
  subscribe: (
    input: SocketSubscribeInput,
    ack: (result: SocketSubscribeResult) => void,
  ) => void;
}

/** Events the server pushes to clients — the delta-state sync channel (ADR-0008). */
export interface ServerToClientEvents {
  sync: (event: RealtimeEvent) => void;
}

export type AppServer = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketContext
>;
export type AppSocket = IOSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketContext
>;
