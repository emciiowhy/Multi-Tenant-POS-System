"use client";

import { publicApiUrl } from "@/lib/env";
import { getAccessToken } from "@/lib/access-token-client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
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
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail || res.statusText);
  }
  return (await res.json()) as T;
}
