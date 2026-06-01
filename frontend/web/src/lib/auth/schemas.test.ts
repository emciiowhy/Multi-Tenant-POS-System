import { describe, expect, it } from "vitest";
import {
  INDUSTRIES,
  onboardSchema,
  signInSchema,
  signUpSchema,
  toRegisterPayload,
} from "./schemas";

describe("signInSchema", () => {
  it("accepts a valid email + 8+ char password", () => {
    expect(signInSchema.safeParse({ email: "a@b.io", password: "hunter22" }).success).toBe(true);
  });
  it("rejects a malformed email and a short password", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "hunter22" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.io", password: "short" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts matching passwords + optional display name", () => {
    const ok = signUpSchema.safeParse({
      email: "a@b.io",
      password: "hunter22",
      confirmPassword: "hunter22",
      displayName: "Jane",
    });
    expect(ok.success).toBe(true);
  });
  it("flags a confirm-password mismatch on the confirmPassword path", () => {
    const res = signUpSchema.safeParse({
      email: "a@b.io",
      password: "hunter22",
      confirmPassword: "different",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });
});

describe("toRegisterPayload", () => {
  it("strips confirmPassword before the network call", () => {
    const payload = toRegisterPayload({
      email: "a@b.io",
      password: "hunter22",
      confirmPassword: "hunter22",
      displayName: "Jane",
    });
    expect(payload).toEqual({ email: "a@b.io", password: "hunter22", displayName: "Jane" });
    expect("confirmPassword" in payload).toBe(false);
  });
});

describe("onboardSchema", () => {
  it("mirrors the backend createInput: name + slug charset + optional industry", () => {
    expect(
      onboardSchema.safeParse({ name: "Acme", slug: "acme-coffee", industry: "retail" }).success,
    ).toBe(true);
    expect(onboardSchema.safeParse({ name: "Acme", slug: "acme-coffee" }).success).toBe(true);
  });
  it("rejects an empty name and a non-conforming slug", () => {
    expect(onboardSchema.safeParse({ name: "", slug: "acme" }).success).toBe(false);
    expect(onboardSchema.safeParse({ name: "Acme", slug: "Acme Coffee" }).success).toBe(false);
    expect(onboardSchema.safeParse({ name: "Acme", slug: "acme_coffee" }).success).toBe(false);
  });
  it("rejects an unknown industry", () => {
    expect(onboardSchema.safeParse({ name: "Acme", slug: "acme", industry: "mining" }).success).toBe(
      false,
    );
    // the four supported verticals
    expect(INDUSTRIES).toEqual(["retail", "restaurant", "auto_service", "dealership"]);
  });
});
