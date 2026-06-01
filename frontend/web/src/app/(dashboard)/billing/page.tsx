"use client";

import { useState } from "react";
import { openPortal, startCheckout, useSubscription } from "@/lib/billing/queries";
import { bannerState } from "@/lib/billing/banner-logic";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BadgeVariant } from "@/lib/ui/badge-variant";

/**
 * Billing screen (PRD: billing/subscription gate, issue 06). Shows the Company's
 * subscription status + plan and offers Subscribe (Stripe Checkout) and Manage
 * (Stripe portal). Reachable even when the gate has blocked the rest of the app,
 * so a lapsed Company can always pay its way back in. On the shared primitives +
 * tokens (slice 09).
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
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold text-fg">Billing</h1>

      <section className="rounded-card border border-border bg-surface p-5 shadow-card">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : isError || !sub ? (
          <p className="text-sm text-fg-muted">
            No active subscription. Subscribe to start using VendMe.
          </p>
        ) : (
          <Status sub={sub} />
        )}

        <div className="mt-5 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => run("checkout")}
            disabled={busy !== null}
            loading={busy === "checkout"}
          >
            {busy === "checkout" ? "Redirecting…" : "Subscribe"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => run("portal")}
            disabled={busy !== null || !sub?.stripeCustomerId}
            loading={busy === "portal"}
          >
            {busy === "portal" ? "Redirecting…" : "Manage"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>
    </div>
  );
}

function Status({
  sub,
}: {
  sub: {
    status: string;
    currentPeriodEnd: string | null;
    plan: { name: string; priceMonthly: string } | null;
  };
}) {
  const state = bannerState(sub, new Date());
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—";
  const { label, variant }: { label: string; variant: BadgeVariant } =
    state.kind === "trial_ending"
      ? { label: `Trial — ${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left`, variant: "warning" }
      : state.kind === "trial_expired"
        ? { label: "Trial ended", variant: "danger" }
        : state.kind === "past_due"
          ? { label: "Payment past due", variant: "danger" }
          : { label: sub.status, variant: "neutral" };

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <dt className="text-fg-muted">Status</dt>
        <dd>
          <Badge variant={variant}>{label}</Badge>
        </dd>
      </div>
      <Row label="Plan" value={sub.plan ? `${sub.plan.name} ($${sub.plan.priceMonthly}/mo)` : "—"} />
      <Row label="Renews / ends" value={periodEnd} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}
