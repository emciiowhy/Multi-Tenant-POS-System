import { describe, expect, it } from "vitest";
import { buildRefundPosting, buildSalePosting, isBalanced } from "./accounting.logic.js";

const ACCOUNTS = {
  cashAccountId: "cash",
  revenueAccountId: "rev",
  taxAccountId: "tax",
};

describe("double-entry posting", () => {
  it("a sale posting balances: Dr Cash = Cr Revenue + Cr Tax", () => {
    const lines = buildSalePosting(ACCOUNTS, "26.9500", "2.4500");
    expect(isBalanced(lines)).toBe(true);
    const cash = lines.find((l) => l.accountId === "cash")!;
    const rev = lines.find((l) => l.accountId === "rev")!;
    const tax = lines.find((l) => l.accountId === "tax")!;
    expect(cash.debit).toBe("26.9500");
    expect(rev.credit).toBe("24.5000");
    expect(tax.credit).toBe("2.4500");
  });

  it("a refund posting balances", () => {
    const lines = buildRefundPosting(ACCOUNTS, "5.0000");
    expect(isBalanced(lines)).toBe(true);
  });

  it("isBalanced rejects an unbalanced entry", () => {
    expect(
      isBalanced([
        { accountId: "a", debit: "10.0000", credit: "0" },
        { accountId: "b", debit: "0", credit: "9.0000" },
      ]),
    ).toBe(false);
  });
});
