import { describe, expect, it } from "vitest";
import { reduceStripeEvent, type StripeEventLike } from "./stripe-webhook.logic";

const PERIOD_END_SEC = 1_700_000_000;
const PERIOD_END = new Date(PERIOD_END_SEC * 1000);

const subEvent = (
  type: string,
  status: string,
  currentPeriodEnd: number | null = PERIOD_END_SEC,
): StripeEventLike => ({
  type,
  data: { object: { id: "sub_1", customer: "cus_1", status, current_period_end: currentPeriodEnd } },
});

const invoiceEvent = (
  type: string,
  periodEnd: number | null = null,
): StripeEventLike => ({
  type,
  data: { object: { customer: "cus_1", subscription: "sub_1", periodEnd } },
});

describe("reduceStripeEvent", () => {
  it("maps customer.subscription.updated to status + period + stripe ids", () => {
    expect(reduceStripeEvent(subEvent("customer.subscription.updated", "active"))).toEqual({
      status: "active",
      currentPeriodEnd: PERIOD_END,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("maps a past_due subscription update", () => {
    expect(
      reduceStripeEvent(subEvent("customer.subscription.updated", "past_due")),
    ).toMatchObject({ status: "past_due", stripeSubscriptionId: "sub_1" });
  });

  it("maps customer.subscription.deleted to canceled", () => {
    expect(reduceStripeEvent(subEvent("customer.subscription.deleted", "canceled"))).toMatchObject(
      { status: "canceled", stripeSubscriptionId: "sub_1" },
    );
  });

  it("maps unknown Stripe statuses to a blocked status", () => {
    expect(
      reduceStripeEvent(subEvent("customer.subscription.updated", "incomplete_expired")),
    ).toMatchObject({ status: "canceled" });
    expect(
      reduceStripeEvent(subEvent("customer.subscription.updated", "paused")),
    ).toMatchObject({ status: "canceled" });
  });

  it("maps invoice.paid to active (with the period end when present)", () => {
    expect(reduceStripeEvent(invoiceEvent("invoice.paid", PERIOD_END_SEC))).toEqual({
      status: "active",
      currentPeriodEnd: PERIOD_END,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("maps invoice.payment_failed to past_due", () => {
    expect(reduceStripeEvent(invoiceEvent("invoice.payment_failed"))).toMatchObject({
      status: "past_due",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("ignores unrecognised event types", () => {
    expect(reduceStripeEvent({ type: "charge.refunded", data: { object: { customer: "cus_1" } } })).toBeNull();
  });

  it("is idempotent — the same event yields the same change", () => {
    const e = subEvent("customer.subscription.updated", "active");
    expect(reduceStripeEvent(e)).toEqual(reduceStripeEvent(e));
  });
});
