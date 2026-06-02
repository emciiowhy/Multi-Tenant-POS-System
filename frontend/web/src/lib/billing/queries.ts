"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface SubscriptionView {
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  plan: { key: string; name: string; priceMonthly: string } | null;
}

/** The Company's subscription for the billing page + app-shell banner. */
export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => apiFetch<{ subscription: SubscriptionView | null }>("/v1/billing/subscription"),
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

/** Start Stripe Checkout and redirect the browser to the returned hosted URL. */
export async function startCheckout(planKey = "standard"): Promise<void> {
  const { url } = await apiFetch<{ url: string }>("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planKey }),
  });
  window.location.assign(url);
}

/** Open the Stripe billing portal (manage card / cancel) in the browser. */
export async function openPortal(): Promise<void> {
  const { url } = await apiFetch<{ url: string }>("/v1/billing/portal", { method: "POST" });
  window.location.assign(url);
}
