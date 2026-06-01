import { describe, expect, it } from "vitest";
import { authModeFromParam, authModeToParam } from "./auth-flow";

describe("authModeFromParam", () => {
  it("maps the publicly-linkable ?mode values", () => {
    expect(authModeFromParam("signup")).toBe("signup");
    expect(authModeFromParam("signin")).toBe("signin");
  });
  it("defaults to signin for absent / unknown / gated values", () => {
    expect(authModeFromParam(null)).toBe("signin");
    expect(authModeFromParam(undefined)).toBe("signin");
    expect(authModeFromParam("garbage")).toBe("signin");
    // onboarding is session-derived, never a deep link
    expect(authModeFromParam("onboarding")).toBe("signin");
  });
});

describe("authModeToParam", () => {
  it("keeps a clean URL for signin (and the session-derived onboarding)", () => {
    expect(authModeToParam("signin")).toBeNull();
    expect(authModeToParam("onboarding")).toBeNull();
  });
  it("reflects signup in the URL", () => {
    expect(authModeToParam("signup")).toBe("signup");
  });
});
