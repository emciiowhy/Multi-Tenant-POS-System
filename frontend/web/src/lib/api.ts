"use client";

import { publicApiUrl } from "@/lib/env";
import { getAccessToken } from "@/lib/access-token-client";
import { notifyBillingRequired } from "@/lib/billing/billing-redirect";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * A 402 from the tenant gate (ADR-0005): the Company isn't entitled. Carries the
 * machine code (`subscription_required` / `trial_expired` / `past_due` / …) so
 * the app can route to /billing rather than surfacing a raw error.
 */
export class BillingRequiredError extends ApiError {
  constructor(readonly code: string) {
    super(402, code);
  }
}

/** Reads the machine code from a 402 body (`{ error }`), defaulting sensibly. */
async function billingCode(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "subscription_required";
}

function call(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${publicApiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
      authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Authenticated fetch to the Express backend. Attaches the Bearer access token
 * and transparently re-mints it once on a 401 (covers a token that expired
 * between requests).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let { accessToken } = await getAccessToken();
  let res = await call(path, init, accessToken);
  if (res.status === 401) {
    ({ accessToken } = await getAccessToken(true));
    res = await call(path, init, accessToken);
  }
  if (res.status === 402) {
    // Subscription gate: signal the app to route to /billing, then throw a typed
    // error so callers/queries don't treat it as ordinary failure.
    const code = await billingCode(res);
    notifyBillingRequired(code);
    throw new BillingRequiredError(code);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  return (await res.json()) as T;
}
