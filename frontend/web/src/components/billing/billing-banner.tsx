"use client";

import { bannerState, type BannerSub } from "@/lib/billing/banner-logic";

/** App-shell warning bar for trial-ending / past-due / blocked states. Renders
 *  nothing when the subscription is healthy. Driven by props so it's pure to test. */
export function BillingBanner({ sub, now }: { sub: BannerSub | null; now?: Date }) {
  const state = bannerState(sub, now ?? new Date());
  if (state.kind === "none") return null;

  const { message, cta } = describe(state);
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-warning/40 bg-warning-bg px-4 py-2 text-sm text-warning"
    >
      <span>{message}</span>
      <a href="/billing" className="shrink-0 font-medium underline underline-offset-2">
        {cta}
      </a>
    </div>
  );
}

function describe(state: Exclude<ReturnType<typeof bannerState>, { kind: "none" }>): {
  message: string;
  cta: string;
} {
  switch (state.kind) {
    case "trial_ending":
      return {
        message: `Your free trial ends in ${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"}.`,
        cta: "Subscribe",
      };
    case "trial_expired":
      return { message: "Your free trial has ended.", cta: "Subscribe" };
    case "past_due":
      return {
        message: "Your last payment failed — update your billing to avoid losing access.",
        cta: "Fix payment",
      };
    case "blocked":
      return { message: `Your subscription is ${state.status}.`, cta: "Manage billing" };
  }
}
