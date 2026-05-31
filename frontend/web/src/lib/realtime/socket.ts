"use client";

import { io, type Socket } from "socket.io-client";
import type {
  RealtimeEvent,
  SocketSubscribeInput,
  SocketSubscribeResult,
} from "@vendme/contracts";
import { publicApiUrl } from "@/lib/env";
import { getAccessToken } from "@/lib/access-token-client";

interface ServerToClient {
  sync: (event: RealtimeEvent) => void;
}
interface ClientToServer {
  subscribe: (
    input: SocketSubscribeInput,
    ack: (result: SocketSubscribeResult) => void,
  ) => void;
}

export type RealtimeSocket = Socket<ServerToClient, ClientToServer>;

/**
 * Opens an authenticated realtime connection to the gateway (ADR-0007). The
 * access token is fetched fresh on every (re)connect through the `auth`
 * callback, so a reconnect after the ~10-min token expiry re-authenticates
 * cleanly — matching the gateway's connect-time auth model.
 */
export function connectRealtime(): RealtimeSocket {
  return io(publicApiUrl, {
    path: "/realtime",
    transports: ["websocket"],
    auth: (cb) => {
      getAccessToken(true)
        .then(({ accessToken }) => cb({ token: accessToken }))
        .catch(() => cb({}));
    },
  });
}
