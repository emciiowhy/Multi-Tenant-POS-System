import { describe, expect, it } from "vitest";
import { resolveActionLock } from "./action-lock";

describe("resolveActionLock", () => {
  it("soft-locks gated actions while the subscription is expired / past due / blocked", () => {
    for (const banner of ["trial_expired", "past_due", "blocked"] as const) {
      const lock = resolveActionLock({ banner });
      expect(lock.locked).toBe(true);
      expect(typeof lock.reason).toBe("string");
      expect(lock.reason).toBeTruthy();
    }
  });

  it("does not lock for a healthy subscription or a mere trial-ending nudge", () => {
    for (const banner of ["none", "trial_ending"] as const) {
      expect(resolveActionLock({ banner })).toEqual({ locked: false, reason: null });
    }
  });
});
