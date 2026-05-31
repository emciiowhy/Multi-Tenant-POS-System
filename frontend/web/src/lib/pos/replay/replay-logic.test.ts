import { describe, expect, it } from "vitest";
import type { PosEventResult } from "@vendme/contracts";
import { backoffDelay, classifyResults, isAuthError } from "./replay-logic";

const result = (status: PosEventResult["status"], reason?: string): PosEventResult => ({
  clientUuid: "x",
  status,
  ...(reason ? { reason } : {}),
});

describe("classifyResults", () => {
  it("treats an all-applied batch as applied", () => {
    expect(classifyResults([result("applied"), result("applied")])).toBe("applied");
  });

  it("treats duplicate as applied (idempotent replay)", () => {
    expect(classifyResults([result("applied"), result("duplicate")])).toBe("applied");
  });

  it("returns the rejection reason when any event is rejected", () => {
    expect(classifyResults([result("applied"), result("rejected", "forbidden")])).toEqual({
      rejected: "forbidden",
    });
  });
});

describe("backoffDelay", () => {
  it("grows exponentially from the base", () => {
    expect(backoffDelay(1, 1000, 60000)).toBe(1000);
    expect(backoffDelay(2, 1000, 60000)).toBe(2000);
    expect(backoffDelay(3, 1000, 60000)).toBe(4000);
  });

  it("caps at capMs", () => {
    expect(backoffDelay(20, 1000, 60000)).toBe(60000);
  });
});

describe("isAuthError", () => {
  it("is true for a 401 error", () => {
    expect(isAuthError({ status: 401 })).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isAuthError({ status: 500 })).toBe(false);
    expect(isAuthError(new Error("network"))).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });
});
