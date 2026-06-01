"use client";

import { BillingRedirect } from "./billing-redirect";

/**
 * App-shell billing chrome: the 402→/billing redirect listener (cheap, always
 * on), mounted once at the app root. The trial/past-due banner moved into the
 * dashboard shell's reserved banner slot (slice 07, {@link BillingBannerSlot}) so
 * it reserves layout space instead of floating above every page.
 */
export function BillingChrome() {
  return <BillingRedirect />;
}
