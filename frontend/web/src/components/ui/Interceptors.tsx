"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { bannerState, type BannerSub } from "@/lib/billing/banner-logic";
import { useSubscription } from "@/lib/billing/queries";
import { offlineIndicatorState, type OfflineIndicatorState } from "@/lib/shell/offline-indicator";
import { resolveActionLock, type ActionLock } from "@/lib/shell/action-lock";
import { useOnline } from "@/lib/shell/use-connectivity";
import { useOutboxPending, retrySync } from "@/lib/pos/use-outbox";
import { cn } from "@/lib/ui/cn";
import { BillingBanner } from "@/components/billing/billing-banner";

/**
 * Shell interceptors (UI/UX modernization, slice 07). Centralizes the two
 * cross-cutting states the shell projects everywhere:
 *   - the billing banner + the subscription-lockout action soft-lock, and
 *   - the offline / outbox-queue indicator.
 *
 * The subscription read (react-query) lives here, in a provider mounted *above*
 * the AppShell — so the shell's header/banner components and the page actions
 * consume a plain context (with a safe loading default outside a provider), and
 * the AppShell stays unit-testable without a QueryClient. Reuses the existing
 * pure logic (`bannerState`, `offlineIndicatorState`, `resolveActionLock`) and
 * the outbox/replay seam (`useOutboxPending`, `retrySync`) — nothing reinvented.
 */
export interface InterceptorState {
  /** The active company's subscription, for the banner slot. */
  bannerSub: BannerSub | null;
  /** Connectivity + outbox depth, for the header indicator. */
  offline: OfflineIndicatorState;
  /** Shell-wide soft-lock for gated actions (subscription lockout). */
  lock: ActionLock;
  /** Manually attempt to drain the outbox now. */
  retry: () => void;
}

const DEFAULT_INTERCEPTORS: InterceptorState = {
  bannerSub: null,
  offline: { kind: "online", count: 0, tone: "neutral" },
  lock: { locked: false, reason: null },
  retry: () => {},
};

const InterceptorContext = createContext<InterceptorState | null>(null);

export function InterceptorProvider({ children }: { children: ReactNode }) {
  const { data } = useSubscription();
  const bannerSub = data?.subscription ?? null;
  const online = useOnline();
  const pendingCount = useOutboxPending();

  const value = useMemo<InterceptorState>(() => {
    const offline = offlineIndicatorState({ online, pendingCount });
    const lock = resolveActionLock({ banner: bannerState(bannerSub, new Date()).kind });
    return { bannerSub, offline, lock, retry: retrySync };
  }, [bannerSub, online, pendingCount]);

  return <InterceptorContext.Provider value={value}>{children}</InterceptorContext.Provider>;
}

/** Reads the shell interceptor state. Safe loading default outside a provider. */
export function useInterceptors(): InterceptorState {
  return useContext(InterceptorContext) ?? DEFAULT_INTERCEPTORS;
}

/** The soft-lock for gated actions — feed straight into `Button` `blockedReason`. */
export function useActionLock(): ActionLock {
  return useInterceptors().lock;
}

/**
 * Reserved, in-flow billing banner slot. Renders the trial/past-due banner (which
 * returns null when healthy) inside a normal block element so it pushes shell
 * content down instead of overlaying it — geometry never breaks. Stays out of the
 * billing page's own way.
 */
export function BillingBannerSlot() {
  const { bannerSub } = useInterceptors();
  const pathname = usePathname() ?? "/";
  return (
    <div data-testid="billing-banner-slot" className="shrink-0">
      {pathname !== "/billing" && <BillingBanner sub={bannerSub} />}
    </div>
  );
}

/**
 * Subtle header connectivity/sync indicator. A quiet dot when online and synced;
 * when work is queued it expands to a count + "syncing when online" with a
 * "Retry now"; offline it says so. Driven by the slice-04 `offlineIndicatorState`.
 */
export function OfflineIndicator() {
  const { offline, retry } = useInterceptors();
  const noun = offline.count === 1 ? "change" : "changes";

  return (
    <div
      data-testid="offline-indicator"
      data-kind={offline.kind}
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-xs text-fg-muted"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          offline.tone === "warning" ? "bg-warning" : "bg-success",
        )}
      />
      {offline.kind === "online" && <span className="sr-only">All changes synced</span>}
      {offline.kind === "queued" && (
        <>
          <span>
            {offline.count} {noun} queued — syncing when online
          </span>
          <button
            type="button"
            onClick={retry}
            className="font-medium text-fg underline underline-offset-2 hover:text-brand"
          >
            Retry now
          </button>
        </>
      )}
      {offline.kind === "offline" && (
        <span>
          Offline — {offline.count} {noun} queued
        </span>
      )}
    </div>
  );
}
