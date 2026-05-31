import { describe, expect, it } from "vitest";
import { isValidTableTransition } from "./table.logic.js";

describe("floor table transitions", () => {
  it("advances through the service lifecycle", () => {
    expect(isValidTableTransition("free", "seated")).toBe(true);
    expect(isValidTableTransition("seated", "ordered")).toBe(true);
    expect(isValidTableTransition("ordered", "bill")).toBe(true);
    expect(isValidTableTransition("bill", "free")).toBe(true);
  });

  it("allows clearing an occupied table straight to free", () => {
    expect(isValidTableTransition("seated", "free")).toBe(true);
    expect(isValidTableTransition("ordered", "free")).toBe(true);
  });

  it("rejects staying in place", () => {
    expect(isValidTableTransition("free", "free")).toBe(false);
  });

  it("rejects backward and skip-ahead moves", () => {
    expect(isValidTableTransition("ordered", "seated")).toBe(false);
    expect(isValidTableTransition("bill", "ordered")).toBe(false);
    expect(isValidTableTransition("free", "ordered")).toBe(false);
  });
});
