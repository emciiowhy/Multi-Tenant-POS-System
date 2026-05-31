import { describe, expect, it } from "vitest";
import { isValidKdsTransition } from "./kds.logic.js";

describe("KDS ticket transitions", () => {
  it("advances forward through the lifecycle", () => {
    expect(isValidKdsTransition("queued", "preparing")).toBe(true);
    expect(isValidKdsTransition("preparing", "ready")).toBe(true);
    expect(isValidKdsTransition("ready", "served")).toBe(true);
  });

  it("allows skipping a forward stage", () => {
    expect(isValidKdsTransition("queued", "ready")).toBe(true);
    expect(isValidKdsTransition("queued", "served")).toBe(true);
  });

  it("rejects staying in place", () => {
    expect(isValidKdsTransition("preparing", "preparing")).toBe(false);
  });

  it("rejects moving backward", () => {
    expect(isValidKdsTransition("ready", "preparing")).toBe(false);
    expect(isValidKdsTransition("served", "queued")).toBe(false);
  });
});
