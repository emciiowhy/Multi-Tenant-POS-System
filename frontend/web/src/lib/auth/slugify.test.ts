import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and dashes a normal company name", () => {
    expect(slugify("Acme Coffee")).toBe("acme-coffee");
  });
  it("collapses punctuation and runs of separators into single dashes", () => {
    expect(slugify("Bean & Bros!!")).toBe("bean-bros");
    expect(slugify("a -- b")).toBe("a-b");
  });
  it("trims leading/trailing separators and surrounding whitespace", () => {
    expect(slugify("  Hello  World  ")).toBe("hello-world");
  });
  it("returns an empty string when nothing slug-able remains", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });
  it("always produces a string that satisfies the onboard slug charset", () => {
    const out = slugify("Café 99 — Niño's Diner");
    expect(out === "" || /^[a-z0-9-]+$/.test(out)).toBe(true);
  });
});
