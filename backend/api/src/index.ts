import { createServer as createHttpServer } from "node:http";
import { InMemoryRevocationStore } from "@vendme/auth";
import { env } from "./env.js";
import { createServer } from "./server.js";
import { createGateway } from "./realtime/gateway.js";

// One revocation store shared by the HTTP middleware and the WS handshake, so
// a revoked sid is rejected on both transports. Production swaps this for the
// Redis-backed implementation in a later slice.
const revocations = new InMemoryRevocationStore();

const app = createServer(revocations);
const httpServer = createHttpServer(app);
createGateway(httpServer, { revocations });

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`vendme-backend-api listening on :${env.PORT}`);
});
