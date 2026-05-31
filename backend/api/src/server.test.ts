import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

// env.ts validates required config at import time, so set it before importing
// the server module.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.JWT_PUBLIC_KEY ??= "dummy";

let app: Express;

beforeAll(async () => {
  const { createServer } = await import("./server.js");
  app = createServer();
});

describe("backend-api wiring", () => {
  it("health endpoint responds ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("protected route rejects requests without a bearer token (fails closed)", async () => {
    const res = await request(app).get("/v1/companies/context");
    expect(res.status).toBe(401);
  });

  it("rejects an obviously invalid token", async () => {
    const res = await request(app)
      .get("/v1/companies/context")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("validates request bodies (422 on bad register input)", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(422);
  });

  it("mounts POS + shift + inventory routes and protects them (401, not 404)", async () => {
    const pos = await request(app).post("/v1/pos/events").send({ events: [] });
    expect(pos.status).toBe(401);
    const shift = await request(app).post("/v1/shifts").send({});
    expect(shift.status).toBe(401);
    const inventory = await request(app).get("/v1/inventory/on-hand");
    expect(inventory.status).toBe(401);
    const registers = await request(app).get(
      "/v1/companies/branches/11111111-1111-1111-1111-111111111111/registers",
    );
    expect(registers.status).toBe(401);
    const orders = await request(app).get(
      "/v1/pos/orders?branchId=11111111-1111-1111-1111-111111111111",
    );
    expect(orders.status).toBe(401);
  });

  it("mounts the restaurant module and gates it behind auth (401, not 404)", async () => {
    const branchId = "11111111-1111-1111-1111-111111111111";
    const ticketId = "22222222-2222-2222-2222-222222222222";
    // The module seam applies authentication before the enablement gate, so an
    // unauthenticated request fails closed with 401 rather than leaking 404.
    const list = await request(app).get(`/v1/restaurant/kds/${branchId}/tickets`);
    expect(list.status).toBe(401);
    const transition = await request(app)
      .post(`/v1/restaurant/kds/tickets/${ticketId}/transition`)
      .send({ status: "preparing" });
    expect(transition.status).toBe(401);
    const floor = await request(app).get(`/v1/restaurant/floor/${branchId}`);
    expect(floor.status).toBe(401);
    const tableTransition = await request(app)
      .post(`/v1/restaurant/tables/${ticketId}/transition`)
      .send({ status: "seated" });
    expect(tableTransition.status).toBe(401);
  });
});
