"use client";

import { useState } from "react";
import { openPortal, startCheckout, useSubscription } from "@/lib/billing/queries";
import { bannerState } from "@/lib/billing/banner-logic";

/**
 * Billing screen (PRD: billing/subscription gate, issue 06). Shows the Company's
 * subscription status + plan and offers Subscribe (Stripe Checkout) and Manage
 * (Stripe portal). Reachable even when the gate has blocked the rest of the app,
 * so a lapsed Company can always pay its way back in.
 */
export default function BillingPage() {
  const { data, isLoading, isError } = useSubscription();
  const [busy, setBusy] = useState<null | "checkout" | "portal">(null);
  const [error, setError] = useState<string | null>(null);

  const sub = data?.subscription ?? null;

  async function run(action: "checkout" | "portal") {
    setBusy(action);
    setError(null);
    try {
      await (action === "checkout" ? startCheckout(sub?.plan?.key ?? "standard") : openPortal());
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Billing</h1>

      <section className="rounded-lg border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading subscription…</p>
        ) : isError || !sub ? (
          <p className="text-sm text-neutral-500">
            No active subscription. Subscribe to start using VendMe.
          </p>
        ) : (
          <Status sub={sub} />
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => run("checkout")}
            disabled={busy !== null}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {busy === "checkout" ? "Redirecting…" : "Subscribe"}
          </button>
          <button
            onClick={() => run("portal")}
            disabled={busy !== null || !sub?.stripeCustomerId}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            {busy === "portal" ? "Redirecting…" : "Manage"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </main>
  );
}

function Status({
  sub,
}: {
  sub: { status: string; currentPeriodEnd: string | null; plan: { name: string; priceMonthly: string } | null };
}) {
  const state = bannerState(sub, new Date());
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—";
  const label =
    state.kind === "trial_ending"
      ? `Trial — ${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left`
      : state.kind === "trial_expired"
        ? "Trial ended"
        : state.kind === "past_due"
          ? "Payment past due"
          : sub.status;

  return (
    <dl className="space-y-2 text-sm">
      <Row label="Status" value={label} />
      <Row label="Plan" value={sub.plan ? `${sub.plan.name} ($${sub.plan.priceMonthly}/mo)` : "—"} />
      <Row label="Renews / ends" value={periodEnd} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
