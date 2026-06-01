// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// --- The interceptor sources are mocked so the provider can be driven directly,
//     with no QueryClient / onlineManager / IndexedDB needed. ---
const retrySpy = vi.fn();
let online = true;
let pending = 0;
let subscription: { status: string; currentPeriodEnd: string | null } | null = null;
let pathname = "/pos/b1";

vi.mock("@/lib/billing/queries", () => ({
  useSubscription: () => ({ data: { subscription } }),
}));
vi.mock("@/lib/pos/use-outbox", () => ({
  useOutboxPending: () => pending,
  retrySync: () => retrySpy(),
}));
vi.mock("@/lib/shell/use-connectivity", () => ({ useOnline: () => online }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import {
  BillingBannerSlot,
  InterceptorProvider,
  OfflineIndicator,
  useActionLock,
} from "./Interceptors";
import { Button } from "./Button";

beforeEach(() => {
  online = true;
  pending = 0;
  subscription = null;
  pathname = "/pos/b1";
});

afterEach(() => {
  cleanup();
  retrySpy.mockClear();
});

describe("BillingBannerSlot", () => {
  it("mounts the banner in a reserved flow slot that pushes content down (no overlay)", () => {
    subscription = { status: "past_due", currentPeriodEnd: null };
    render(
      <InterceptorProvider>
        <BillingBannerSlot />
        <div data-testid="page-content">content</div>
      </InterceptorProvider>,
    );

    const slot = screen.getByTestId("billing-banner-slot");
    const banner = screen.getByRole("status");
    // The banner lives inside the reserved slot…
    expect(slot.contains(banner)).toBe(true);
    expect(banner.textContent).toMatch(/payment failed/i);
    // …which is a normal flow element (no overlay positioning) so geometry holds…
    expect(slot.className).not.toMatch(/\b(fixed|absolute|sticky)\b/);
    // …and the page content follows it in document order (pushed down, not under).
    const content = screen.getByTestId("page-content");
    expect(slot.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no banner when the subscription is healthy", () => {
    subscription = { status: "active", currentPeriodEnd: null };
    render(
      <InterceptorProvider>
        <BillingBannerSlot />
      </InterceptorProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays out of the way on the billing page itself", () => {
    subscription = { status: "past_due", currentPeriodEnd: null };
    pathname = "/billing";
    render(
      <InterceptorProvider>
        <BillingBannerSlot />
      </InterceptorProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("OfflineIndicator", () => {
  it("shows a subtle warning badge with the queued count and fires retry", () => {
    online = true;
    pending = 3;
    render(
      <InterceptorProvider>
        <OfflineIndicator />
      </InterceptorProvider>,
    );
    const ind = screen.getByTestId("offline-indicator");
    expect(ind.getAttribute("data-kind")).toBe("queued");
    expect(ind.textContent).toMatch(/3/);
    expect(ind.textContent).toMatch(/queued/i);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(retrySpy).toHaveBeenCalled();
  });

  it("is a subtle dot with no retry when online and fully synced", () => {
    online = true;
    pending = 0;
    render(
      <InterceptorProvider>
        <OfflineIndicator />
      </InterceptorProvider>,
    );
    expect(screen.getByTestId("offline-indicator").getAttribute("data-kind")).toBe("online");
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("reflects the offline state and still carries the queued count", () => {
    online = false;
    pending = 2;
    render(
      <InterceptorProvider>
        <OfflineIndicator />
      </InterceptorProvider>,
    );
    const ind = screen.getByTestId("offline-indicator");
    expect(ind.getAttribute("data-kind")).toBe("offline");
    expect(ind.textContent).toMatch(/offline/i);
    expect(ind.textContent).toMatch(/2/);
  });
});

describe("useActionLock (state-locking interceptor)", () => {
  function LockedCharge({ onClick }: { onClick: () => void }) {
    const lock = useActionLock();
    return (
      <Button blockedReason={lock.reason} onClick={onClick}>
        Charge
      </Button>
    );
  }

  it("forces a soft-lock blockedReason onto gated actions during a subscription lockout", () => {
    subscription = { status: "past_due", currentPeriodEnd: null };
    const onClick = vi.fn();
    render(
      <InterceptorProvider>
        <LockedCharge onClick={onClick} />
      </InterceptorProvider>,
    );
    const btn = screen.getByRole("button", { name: /charge/i });
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.hasAttribute("data-blocked")).toBe(true);
    expect(btn.getAttribute("title")).toBeTruthy();

    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("leaves gated actions live when the subscription is healthy", () => {
    subscription = { status: "active", currentPeriodEnd: null };
    const onClick = vi.fn();
    render(
      <InterceptorProvider>
        <LockedCharge onClick={onClick} />
      </InterceptorProvider>,
    );
    const btn = screen.getByRole("button", { name: /charge/i });
    expect(btn.getAttribute("aria-disabled")).toBeNull();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
