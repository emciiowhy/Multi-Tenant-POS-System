"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True only after client hydration; false on the server and the first client
 * render. SSR-safe replacement for the `useState(false)` + `useEffect(setTrue)`
 * mounted-guard — no state, no effect, so it doesn't trip
 * `react-hooks/set-state-in-effect`. Same semantics: gate client-only/persisted
 * reads behind it to avoid a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
