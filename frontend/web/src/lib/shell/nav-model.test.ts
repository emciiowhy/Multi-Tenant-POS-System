import { describe, expect, it } from "vitest";
import { navItemsFor, type CanFn } from "./nav-model";

const allow: CanFn = () => true;
const deny: CanFn = () => false;

describe("navItemsFor", () => {
  it("includes restaurant items only when the module is enabled", () => {
    const withR = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: "b1" },
      allow,
    ).map((i) => i.key);
    expect(withR).toContain("floor");
    expect(withR).toContain("kds");

    const withoutR = navItemsFor({ role: "x", enabledModules: {}, branchId: "b1" }, allow).map(
      (i) => i.key,
    );
    expect(withoutR).not.toContain("floor");
    expect(withoutR).not.toContain("kds");
  });

  it("hides permission-gated items a role can't access; ungated billing always shows", () => {
    const keys = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: "b1" },
      deny,
    ).map((i) => i.key);
    expect(keys).toEqual(["billing"]);
  });

  it("omits branch-scoped items when there is no active branch", () => {
    const keys = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: null },
      allow,
    ).map((i) => i.key);
    expect(keys).toEqual(["billing"]);
  });

  it("builds branch-scoped hrefs from the active branch, and a static billing href", () => {
    const items = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: "b1" },
      allow,
    );
    expect(items.find((i) => i.key === "pos")?.href).toBe("/pos/b1");
    expect(items.find((i) => i.key === "floor")?.href).toBe("/restaurant/floor/b1");
    expect(items.find((i) => i.key === "billing")?.href).toBe("/billing");
  });

  it("returns items in a stable, declared order", () => {
    const keys = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: "b1" },
      allow,
    ).map((i) => i.key);
    expect(keys).toEqual(["pos", "shifts", "returns", "floor", "kds", "billing"]);
  });

  it("can hide a single item via the permission predicate", () => {
    const noKds: CanFn = (_role, perm) => perm !== "restaurant:kds:operate";
    const keys = navItemsFor(
      { role: "x", enabledModules: { restaurant: true }, branchId: "b1" },
      noKds,
    ).map((i) => i.key);
    expect(keys).toContain("floor");
    expect(keys).not.toContain("kds");
  });
});
