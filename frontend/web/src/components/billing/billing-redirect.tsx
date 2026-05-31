"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onBillingRequired } from "@/lib/billing/billing-redirect";

/**
 * Listens for billing-required (402) signals from the API client and routes the
 * user to /billing. Renders nothing; mounted once in the app shell. Already on
 * /billing? Stay put — the page handles subscribing.
 */
export function BillingRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(
    () =>
      onBillingRequired(() => {
        if (pathname !== "/billing") router.push("/billing");
      }),
    [router, pathname],
  );

  return null;
}
