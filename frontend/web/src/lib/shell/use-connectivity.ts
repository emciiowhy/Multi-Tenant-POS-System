"use client";

import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

/**
 * Live online/offline flag from TanStack Query's `onlineManager` — the same
 * source the POS Replay engine uses for reconnect detection (slice 07). Isolated
 * here as a thin hook so the interceptor provider depends on a tiny, mockable
 * seam rather than reaching into `onlineManager` directly. SSR-safe: the server
 * snapshot is `true` (optimistic), matched on hydration.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(() => onChange()),
    () => onlineManager.isOnline(),
    () => true
  );
}
