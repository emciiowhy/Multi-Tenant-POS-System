import { describe, expect, it } from "vitest";
import { JwtMinter, JwtVerifier, generateAccessKeyPair } from "./jwt.js";
import { can, resolvePermissions } from "./rbac.js";
import { InMemoryRevocationStore } from "./revocation.js";

describe("RBAC", () => {
  it("super_admin holds every permission via wildcard", () => {
    expect(can("super_admin", "billing:subscription:manage")).toBe(true);
    expect(can("super_admin", "pos:order:refund")).toBe(true);
  });

  it("cashier can fire orders but cannot refund", () => {
    expect(can("cashier", "pos:order:fire")).toBe(true);
    expect(can("cashier", "pos:order:refund")).toBe(false);
  });

  it("inheritance flows: branch_manager → supervisor → cashier", () => {
    const perms = resolvePermissions("branch_manager");
    expect(perms.has("pos:order:create")).toBe(true); // from cashier
    expect(perms.has("pos:shift:open")).toBe(true); // from supervisor
    expect(perms.has("pos:order:refund")).toBe(true); // own grant
  });

  it("waiter cannot operate the kitchen display", () => {
    expect(can("waiter", "restaurant:kds:operate")).toBe(false);
    expect(can("kitchen_staff", "restaurant:kds:operate")).toBe(true);
  });
});

describe("JWT round-trip", () => {
  it("mints with the private key and verifies via JWKS", async () => {
    const { privateKeyPkcs8, publicKeySpki } = await generateAccessKeyPair();
    const minter = await JwtMinter.fromPkcs8(privateKeyPkcs8);
    const verifier = await JwtVerifier.fromPublicKey(publicKeySpki);

    const token = await minter.mint({
      accountId: "11111111-1111-1111-1111-111111111111",
      companyId: "22222222-2222-2222-2222-222222222222",
      role: "cashier",
      sid: "33333333-3333-3333-3333-333333333333",
    });

    const claims = await verifier.verify(token);
    expect(claims.sub).toBe("11111111-1111-1111-1111-111111111111");
    expect(claims.company).toBe("22222222-2222-2222-2222-222222222222");
    expect(claims.role).toBe("cashier");
  });

  it("mints a company-less onboarding token (account-scoped) and verifies it", async () => {
    const { privateKeyPkcs8, publicKeySpki } = await generateAccessKeyPair();
    const minter = await JwtMinter.fromPkcs8(privateKeyPkcs8);
    const verifier = await JwtVerifier.fromPublicKey(publicKeySpki);

    // No companyId — a brand-new account with no tenant yet (PRD §2.3).
    const token = await minter.mint({
      accountId: "11111111-1111-1111-1111-111111111111",
      role: "",
      sid: "33333333-3333-3333-3333-333333333333",
    });

    const claims = await verifier.verify(token);
    expect(claims.sub).toBe("11111111-1111-1111-1111-111111111111");
    expect(claims.company).toBeUndefined();
  });

  it("rejects a tampered token", async () => {
    const { privateKeyPkcs8, publicKeySpki } = await generateAccessKeyPair();
    const minter = await JwtMinter.fromPkcs8(privateKeyPkcs8);
    const verifier = await JwtVerifier.fromPublicKey(publicKeySpki);
    const token = await minter.mint({
      accountId: "11111111-1111-1111-1111-111111111111",
      companyId: "22222222-2222-2222-2222-222222222222",
      role: "cashier",
      sid: "33333333-3333-3333-3333-333333333333",
    });
    await expect(verifier.verify(token + "x")).rejects.toThrow();
  });
});

describe("revocation store", () => {
  it("reports revoked sids until TTL expiry", async () => {
    const store = new InMemoryRevocationStore();
    expect(await store.isRevoked("abc")).toBe(false);
    await store.revoke("abc", 60);
    expect(await store.isRevoked("abc")).toBe(true);
  });
});
