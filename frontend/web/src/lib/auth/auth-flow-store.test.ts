import { afterEach, describe, expect, it } from "vitest";
import { useAuthFlowStore } from "./auth-flow-store";

afterEach(() => useAuthFlowStore.getState().reset());

describe("useAuthFlowStore", () => {
  it("starts on sign-in with no pending email", () => {
    const s = useAuthFlowStore.getState();
    expect(s.mode).toBe("signin");
    expect(s.pendingEmail).toBeNull();
  });

  it("switches mode (signin → signup → onboarding)", () => {
    useAuthFlowStore.getState().setMode("signup");
    expect(useAuthFlowStore.getState().mode).toBe("signup");
    useAuthFlowStore.getState().setMode("onboarding");
    expect(useAuthFlowStore.getState().mode).toBe("onboarding");
  });

  it("carries a pending email across a mode switch (e.g. dup-email → sign in)", () => {
    useAuthFlowStore.getState().setPendingEmail("jane@x.io");
    useAuthFlowStore.getState().setMode("signin");
    expect(useAuthFlowStore.getState().pendingEmail).toBe("jane@x.io");
  });

  it("reset returns to the initial sign-in state", () => {
    useAuthFlowStore.getState().setMode("onboarding");
    useAuthFlowStore.getState().setPendingEmail("a@b.io");
    useAuthFlowStore.getState().reset();
    expect(useAuthFlowStore.getState().mode).toBe("signin");
    expect(useAuthFlowStore.getState().pendingEmail).toBeNull();
  });
});
