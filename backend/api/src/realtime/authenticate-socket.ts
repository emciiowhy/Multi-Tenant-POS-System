import type { ExtendedError } from "socket.io";
import type { RevocationStore } from "@vendme/auth";
import { SOCKET_AUTH_ERRORS } from "@vendme/contracts";
import { verifyAccessToken } from "../lib/jwks.js";
import type { AppSocket } from "./types.js";

/**
 * Socket.IO handshake authentication (ADR-0004/0007) — the WebSocket mirror of
 * {@link authenticate} (middleware/authenticate.ts).
 *
 * Verifies the access JWT presented in the handshake `auth.token` (the same
 * token the browser sends as a Bearer header, never a query param or cookie),
 * checks `sid` against the revocation set, then attaches the company-scoped
 * {@link SocketContext} to `socket.data`. On failure it refuses the connection
 * with a coded error the client surfaces as `connect_error.message`, so the
 * client can tell "refresh the token and retry" (invalid/expired) apart from
 * "stop trying" (revoked).
 *
 * This is connection-time auth: the connection persists past the ~10-min token
 * expiry. Forced eviction of a revoked `sid`'s live sockets is a later slice.
 */
export function socketAuth(revocations: RevocationStore) {
  return async (
    socket: AppSocket,
    next: (err?: ExtendedError) => void,
  ): Promise<void> => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length === 0) {
      next(new Error(SOCKET_AUTH_ERRORS.missingToken));
      return;
    }

    let claims;
    try {
      claims = await verifyAccessToken(token);
    } catch {
      next(new Error(SOCKET_AUTH_ERRORS.invalidToken));
      return;
    }

    if (await revocations.isRevoked(claims.sid)) {
      next(new Error(SOCKET_AUTH_ERRORS.revoked));
      return;
    }

    socket.data = {
      accountId: claims.sub,
      companyId: claims.company,
      role: claims.role,
      sid: claims.sid,
    };
    next();
  };
}
