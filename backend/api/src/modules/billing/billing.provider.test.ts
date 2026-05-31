import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";

// env.ts validates config at import time; set a dummy DSN before importing the
// provider (which imports the validated env).
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

/**
 * Offline test of the Stripe provider's webhook boundary: signature verification
 * and the map from a real Stripe event to the reducer's minimal shape (issue 02).
 * Uses Stripe's own `generateTestHeaderString` — deterministic crypto, no network
 * and no real keys.
 */

const WEBHOOK_SECRET = "whsec_testsecret";
const stripe = new Stripe("sk_test_dummy");

let provider: import("./billing.provider.js").StripeBillingProvider;

beforeAll(async () => {
  const { StripeBillingProvider } = await import("./billing.provider.js");
  provider = new StripeBillingProvider({
    secretKey: "sk_test_dummy",
    webhookSecret: WEBHOOK_SECRET,
    priceByPlan: { standard: "price_123" },
    successUrl: "https://app.example/billing?status=success",
    cancelUrl: "https://app.example/billing?status=canceled",
    portalReturnUrl: "https://app.example/billing",
  });
});

function sign(payloadObj: unknown): { payload: string; header: string } {
  const payload = JSON.stringify(payloadObj);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return { payload, header };
}

describe("StripeBillingProvider.constructEvent", () => {
  it("verifies a valid signature and maps a subscription event to the reducer shape", () => {
    const { payload, header } = sign({
      id: "evt_1",
      type: "customer.subscription.updated",
      data: {
        object: { id: "sub_1", customer: "cus_1", status: "active", current_period_end: 1_700_000_000 },
      },
    });

    const event = provider.constructEvent(payload, header);

    expect(event.type).toBe("customer.subscription.updated");
    expect(event.data.object).toMatchObject({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      current_period_end: 1_700_000_000,
    });
  });

  it("maps an invoice event (period end from the line, customer + subscription ids)", () => {
    const { payload, header } = sign({
      id: "evt_2",
      type: "invoice.paid",
      data: {
        object: {
          customer: "cus_1",
          subscription: "sub_1",
          number: "INV-001",
          amount_paid: 2500,
          lines: { data: [{ period: { end: 1_700_000_000 } }] },
        },
      },
    });

    const event = provider.constructEvent(payload, header);

    expect(event.type).toBe("invoice.paid");
    expect(event.data.object).toMatchObject({
      customer: "cus_1",
      subscription: "sub_1",
      periodEnd: 1_700_000_000,
      number: "INV-001",
      amountPaid: 2500,
    });
  });

  it("rejects a forged signature", () => {
    const { payload } = sign({ id: "evt_3", type: "customer.subscription.deleted", data: { object: { customer: "cus_1" } } });
    expect(() => provider.constructEvent(payload, "t=1,v1=deadbeef")).toThrow();
  });

  it("rejects a body that doesn't match its signature (tampered payload)", () => {
    const { header } = sign({ id: "evt_4", type: "invoice.payment_failed", data: { object: { customer: "cus_1" } } });
    const tampered = JSON.stringify({ id: "evt_4", type: "invoice.payment_failed", data: { object: { customer: "cus_HACKED" } } });
    expect(() => provider.constructEvent(tampered, header)).toThrow();
  });
});
