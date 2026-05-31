import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import type { AddressInfo } from "node:net";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import {
  JwtMinter,
  generateAccessKeyPair,
  InMemoryRevocationStore,
} from "@vendme/auth";
import { roomFor } from "@vendme/contracts";
import { InProcessRealtimeBus } from "./bus.js";
import type { AppServer } from "./types.js";

const COMPANY = "11111111-1111-1111-1111-111111111111";
const ACCOUNT = "22222222-2222-2222-2222-222222222222";
const BRANCH = "33333333-3333-3333-3333-333333333333";
const SID = "44444444-4444-4444-4444-444444444444";
const REVOKED_SID = "55555555-5555-5555-5555-555555555555";
const OTHER_BRANCH = "66666666-6666-6666-6666-666666666666";
const OTHER_COMPANY = "77777777-7777-7777-7777-777777777777";
const ORDER = "88888888-8888-8888-8888-888888888888";
const TICKET = "99999999-9999-9999-9999-999999999999";
const TABLE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

// env.ts validates config at import; set it before importing the gateway.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

let httpServer: HttpServer;
let io: AppServer;
let port: number;
let socketPath: string;
let minter: JwtMinter;
let revocations: InMemoryRevocationStore;
let bus: InProcessRealtimeBus;
/** Toggled per test; the gateway's branch check is injected, so no DB needed. */
let allowBranch = true;
const clients: ClientSocket[] = [];

function mintToken(sid = SID): Promise<string> {
  return minter.mint({ accountId: ACCOUNT, companyId: COMPANY, role: "cashier", sid });
}

/** Opens a client and exposes a promise that settles on connect/connect_error. */
function connect(auth: Record<string, unknown>) {
  const client = ioClient(`http://localhost:${port}`, {
    path: socketPath,
    auth,
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(client);
  const connected = new Promise<void>((resolve, reject) => {
    client.on("connect", () => resolve());
    client.on("connect_error", (err) => reject(err));
  });
  return { client, connected };
}

beforeAll(async () => {
  const { privateKeyPkcs8, publicKeySpki } = await generateAccessKeyPair();
  // Pin the verifier to our generated key; ignore any ambient JWKS_URL.
  delete process.env.JWKS_URL;
  process.env.JWT_PUBLIC_KEY = publicKeySpki;
  minter = await JwtMinter.fromPkcs8(privateKeyPkcs8);

  revocations = new InMemoryRevocationStore();
  await revocations.revoke(REVOKED_SID, 600);

  const { createServer } = await import("../server.js");
  const { createGateway, SOCKET_PATH } = await import("./gateway.js");
  socketPath = SOCKET_PATH;

  bus = new InProcessRealtimeBus();
  const app = createServer(revocations);
  httpServer = createHttpServer(app);
  io = createGateway(httpServer, {
    revocations,
    authorizeBranch: async () => allowBranch,
    bus,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterEach(() => {
  for (const c of clients) c.disconnect();
  clients.length = 0;
  allowBranch = true;
});

afterAll(async () => {
  await new Promise<void>((resolve) => io.close(() => resolve()));
});

describe("realtime handshake authentication", () => {
  it("accepts a connection bearing a valid access token", async () => {
    const token = await mintToken();
    const { connected } = connect({ token });
    await expect(connected).resolves.toBeUndefined();
  });

  it("refuses a handshake with no token", async () => {
    const { connected } = connect({});
    await expect(connected).rejects.toThrow("missing_token");
  });

  it("refuses a handshake with an unverifiable token", async () => {
    const { connected } = connect({ token: "not-a-jwt" });
    await expect(connected).rejects.toThrow("invalid_token");
  });

  it("refuses a handshake whose sid has been revoked", async () => {
    const token = await mintToken(REVOKED_SID);
    const { connected } = connect({ token });
    await expect(connected).rejects.toThrow("revoked");
  });
});

describe("tenant-scoped branch subscription", () => {
  it("joins the company-prefixed branch room on an authorized subscribe", async () => {
    const token = await mintToken();
    const { client, connected } = connect({ token });
    await connected;

    const result = await client.emitWithAck("subscribe", { branchId: BRANCH });
    expect(result).toEqual({ ok: true, rooms: [roomFor.branch(COMPANY, BRANCH)] });

    const inRoom = await io.in(roomFor.branch(COMPANY, BRANCH)).fetchSockets();
    expect(inRoom.map((s) => s.id)).toContain(client.id);
  });

  it("also joins the KDS room when requested", async () => {
    const token = await mintToken();
    const { client, connected } = connect({ token });
    await connected;

    const result = await client.emitWithAck("subscribe", { branchId: BRANCH, kds: true });
    expect(result).toEqual({
      ok: true,
      rooms: [roomFor.branch(COMPANY, BRANCH), roomFor.kds(COMPANY, BRANCH)],
    });
  });

  it("rejects a subscribe to a branch the account may not access", async () => {
    allowBranch = false;
    const token = await mintToken();
    const { client, connected } = connect({ token });
    await connected;

    const result = await client.emitWithAck("subscribe", { branchId: BRANCH });
    expect(result).toEqual({ ok: false, code: "forbidden_branch" });

    const inRoom = await io.in(roomFor.branch(COMPANY, BRANCH)).fetchSockets();
    expect(inRoom.map((s) => s.id)).not.toContain(client.id);
  });

  it("rejects a malformed subscribe payload", async () => {
    const token = await mintToken();
    const { client, connected } = connect({ token });
    await connected;

    const result = await client.emitWithAck("subscribe", { branchId: "not-a-uuid" });
    expect(result).toEqual({ ok: false, code: "invalid_input" });
  });
});

describe("tenant-scoped event delivery", () => {
  /** Connect, subscribe to a branch, and resolve once joined. */
  async function subscribedClient(branchId: string, kds = false) {
    const token = await mintToken();
    const { client, connected } = connect({ token });
    await connected;
    const ack = await client.emitWithAck("subscribe", { branchId, kds });
    expect(ack).toMatchObject({ ok: true });
    return client;
  }

  it("delivers a branch delta to a socket subscribed to that branch", async () => {
    const client = await subscribedClient(BRANCH);
    const event = { type: "order.fired", orderId: ORDER, branchId: BRANCH } as const;

    const received = new Promise((resolve) => client.on("sync", resolve));
    bus.publish({ companyId: COMPANY, branchId: BRANCH, event });

    await expect(received).resolves.toEqual(event);
  });

  it("routes kitchen ticket updates to the KDS room", async () => {
    const client = await subscribedClient(BRANCH, true);
    const event = {
      type: "kitchen.ticket.updated",
      ticketId: TICKET,
      status: "preparing",
    } as const;

    const received = new Promise((resolve) => client.on("sync", resolve));
    bus.publish({ companyId: COMPANY, branchId: BRANCH, event });

    await expect(received).resolves.toEqual(event);
  });

  it("does not deliver a branch delta to a socket in a different branch", async () => {
    const client = await subscribedClient(OTHER_BRANCH);

    let delivered = false;
    client.on("sync", () => {
      delivered = true;
    });
    bus.publish({
      companyId: COMPANY,
      branchId: BRANCH,
      event: { type: "order.fired", orderId: ORDER, branchId: BRANCH },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(delivered).toBe(false);
  });

  it("never leaks a delta across companies (rooms are company-prefixed)", async () => {
    // Client is scoped to COMPANY; the delta is published for OTHER_COMPANY with
    // the same branchId — a different room — so it must not arrive.
    const client = await subscribedClient(BRANCH);

    let delivered = false;
    client.on("sync", () => {
      delivered = true;
    });
    bus.publish({
      companyId: OTHER_COMPANY,
      branchId: BRANCH,
      event: { type: "order.fired", orderId: ORDER, branchId: BRANCH },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(delivered).toBe(false);
  });

  it("delivers table.changed to a branch subscriber (branch room, no KDS needed)", async () => {
    const client = await subscribedClient(BRANCH); // kds:false → branch room only
    const event = { type: "table.changed", tableId: TABLE, status: "seated" } as const;

    const received = new Promise((resolve) => client.on("sync", resolve));
    bus.publish({ companyId: COMPANY, branchId: BRANCH, event });

    await expect(received).resolves.toEqual(event);
  });

  it("does not deliver kitchen ticket updates to a branch-only (non-KDS) subscriber", async () => {
    const client = await subscribedClient(BRANCH); // joined the branch room, not the KDS room

    let delivered = false;
    client.on("sync", () => {
      delivered = true;
    });
    bus.publish({
      companyId: COMPANY,
      branchId: BRANCH,
      event: { type: "kitchen.ticket.updated", ticketId: TICKET, status: "preparing" },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(delivered).toBe(false);
  });

  it("does not deliver table.changed to a socket in a different branch", async () => {
    const client = await subscribedClient(OTHER_BRANCH);

    let delivered = false;
    client.on("sync", () => {
      delivered = true;
    });
    bus.publish({
      companyId: COMPANY,
      branchId: BRANCH,
      event: { type: "table.changed", tableId: TABLE, status: "seated" },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(delivered).toBe(false);
  });
});
