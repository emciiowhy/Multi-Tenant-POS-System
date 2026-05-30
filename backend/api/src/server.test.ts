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
  });
});
