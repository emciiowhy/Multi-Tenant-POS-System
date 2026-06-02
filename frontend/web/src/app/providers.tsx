"use client";

import { useEffect, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { getReplayEngine } from "@/lib/pos/replay";
import { createIdbStorage } from "@/lib/query/idb-storage";
import { BillingChrome } from "@/components/billing/billing-chrome";
import { SessionProvider } from "@/components/auth/SessionProvider";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Client-side providers. TanStack Query owns server-derived state (ADR-0008) and
 * is persisted to IndexedDB so the Register works from a cold offline load
 * (e.g. the product catalog). Realtime deltas are applied into this cache by the
 * delta-sync hook; window refetch is off because realtime keeps it fresh. The
 * POS Replay engine is started here so queued offline sales drain on reconnect.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: DAY_MS, refetchOnWindowFocus: false },
        },
      })
  );

  // Lazy IDB storage (SSR-safe); persister/storage touch IndexedDB only during
  // client-side restore/persist.
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: createIdbStorage(),
      key: "vendme-pos-query-cache",
    })
  );

  useEffect(() => {
    const engine = getReplayEngine();
    engine.start();
    return () => engine.stop();
  }, []);

  return (
    // SessionProvider (slice 06) is outermost so the whole tree — landing, login,
    // and the dashboard shell — can read/update the session via useAppSession.
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: DAY_MS }}
      >
        {/* App-shell billing: 402→/billing redirect + trial/past-due banner (ADR-0005). */}
        <BillingChrome />
        {children}
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}
