import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createIdbStorage } from "./idb-storage";

// Distinct DB names keep the in-process fake IndexedDB isolated per test.
describe("createIdbStorage", () => {
  it("round-trips a value", async () => {
    const storage = createIdbStorage("cache-roundtrip");
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
  });

  it("returns null for a missing key", async () => {
    const storage = createIdbStorage("cache-missing");
    expect(await storage.getItem("nope")).toBeNull();
  });

  it("removes a value", async () => {
    const storage = createIdbStorage("cache-remove");
    await storage.setItem("k", "v");
    await storage.removeItem("k");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("persists across a new instance (survives reload)", async () => {
    const first = createIdbStorage("cache-reload");
    await first.setItem("k", "v");
    const second = createIdbStorage("cache-reload");
    expect(await second.getItem("k")).toBe("v");
  });
});
