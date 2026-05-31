"use client";

import { usePathname } from "next/navigation";
import { useSubscription } from "@/lib/billing/queries";
import { BillingBanner } from "./billing-banner";
import { BillingRedirect } from "./billing-redirect";

/**
 * App-shell billing chrome: the 402→/billing redirect listener (cheap, always on)
 * plus the warning banner fed by the live subscription. The subscription query is
 * skipped on the public login page (and the banner stays out of /billing's own
 * way). Resilient — renders no banner while loading or on error.
 */
export function BillingChrome() {
  const pathname = usePathname();
  const enabled = pathname !== "/login";
  const { data } = useSubscription(enabled);
  return (
    <>
      <BillingRedirect />
      {pathname !== "/billing" && <BillingBanner sub={data?.subscription ?? null} />}
    </>
  );
}
