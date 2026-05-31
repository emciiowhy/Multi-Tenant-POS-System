import { describe, expect, it } from "vitest";
import { buttonClasses, isButtonInert, type ButtonVariant } from "./button-classes";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "danger"];

describe("buttonClasses — semantic variants", () => {
  it("emits a distinct signature per variant (token-driven, no hardcoded hex)", () => {
    expect(buttonClasses("primary", "md")).toContain("bg-brand");
    expect(buttonClasses("secondary", "md")).toContain("bg-surface-2");
    expect(buttonClasses("outline", "md")).toContain("border-border");
    expect(buttonClasses("outline", "md")).toContain("bg-transparent");
    expect(buttonClasses("ghost", "md")).toContain("bg-transparent");
    expect(buttonClasses("danger", "md")).toContain("bg-danger");
  });

  it("renders every variant at every size without throwing", () => {
    for (const v of VARIANTS) {
      expect(buttonClasses(v, "sm")).toContain("h-8");
      expect(buttonClasses(v, "md")).toContain("h-10");
      expect(buttonClasses(v, "lg")).toContain("h-12");
    }
  });
});

describe("buttonClasses — micro-interactions", () => {
  it("an interactive button scales on hover and compresses on active", () => {
    const cls = buttonClasses("primary", "md");
    expect(cls).toContain("motion-safe:hover:scale-");
    expect(cls).toContain("motion-safe:active:scale-");
    expect(cls).toContain("cursor-pointer");
  });

  it("gates every scale behind motion-safe (honors prefers-reduced-motion)", () => {
    const cls = buttonClasses("primary", "md");
    // No UNGATED hover/active scale may ever be emitted.
    expect(cls).not.toMatch(/(^|\s)hover:scale-/);
    expect(cls).not.toMatch(/(^|\s)active:scale-/);
  });
});

describe("buttonClasses — disabled / loading", () => {
  it("a disabled button is inert: not-allowed cursor, dimmed, and never scales", () => {
    const cls = buttonClasses("primary", "md", { disabled: true });
    expect(cls).toContain("cursor-not-allowed");
    expect(cls).toContain("opacity-");
    expect(cls).not.toContain("motion-safe:hover:scale-");
    expect(cls).not.toContain("cursor-pointer");
  });

  it("loading implies non-interactive — same inert treatment as disabled", () => {
    expect(isButtonInert({ loading: true })).toBe(true);
    const cls = buttonClasses("primary", "md", { loading: true });
    expect(cls).toContain("cursor-not-allowed");
    expect(cls).not.toContain("motion-safe:hover:scale-");
  });
});

describe("buttonClasses — blockedReason lockout", () => {
  it("treats a blockedReason (past_due / offline) as inert with a not-allowed cursor", () => {
    expect(isButtonInert({ blockedReason: "past_due" })).toBe(true);
    const cls = buttonClasses("primary", "md", { blockedReason: "Subscription past due" });
    expect(cls).toContain("cursor-not-allowed");
    expect(cls).not.toContain("cursor-pointer");
  });

  it("does not lock when blockedReason is null/empty", () => {
    expect(isButtonInert({ blockedReason: null })).toBe(false);
    expect(isButtonInert({})).toBe(false);
    expect(buttonClasses("primary", "md", { blockedReason: null })).toContain("cursor-pointer");
  });
});
