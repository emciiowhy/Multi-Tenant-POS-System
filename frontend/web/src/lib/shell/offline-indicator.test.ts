import { describe, expect, it } from "vitest";
import { offlineIndicatorState } from "./offline-indicator";

describe("offlineIndicatorState", () => {
  it("is online (neutral) when connected with an empty queue", () => {
    expect(offlineIndicatorState({ online: true, pendingCount: 0 })).toEqual({
      kind: "online",
      count: 0,
      tone: "neutral",
    });
  });

  it("is queued (warning) when connected with pending items", () => {
    expect(offlineIndicatorState({ online: true, pendingCount: 3 })).toEqual({
      kind: "queued",
      count: 3,
      tone: "warning",
    });
  });

  it("is offline (warning) when disconnected, carrying the pending count", () => {
    expect(offlineIndicatorState({ online: false, pendingCount: 0 })).toEqual({
      kind: "offline",
      count: 0,
      tone: "warning",
    });
    expect(offlineIndicatorState({ online: false, pendingCount: 5 })).toEqual({
      kind: "offline",
      count: 5,
      tone: "warning",
    });
  });

  it("clamps a garbage / negative / fractional count deterministically", () => {
    expect(offlineIndicatorState({ online: true, pendingCount: -2 }).count).toBe(0);
    expect(offlineIndicatorState({ online: true, pendingCount: NaN }).count).toBe(0);
    const frac = offlineIndicatorState({ online: true, pendingCount: 3.9 });
    expect(frac.count).toBe(3);
    expect(frac.kind).toBe("queued");
  });
});
