// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const push = vi.fn();
let pathname = "/pos/123";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

import { BillingRedirect } from "./billing-redirect";
import { notifyBillingRequired } from "@/lib/billing/billing-redirect";

afterEach(() => {
  cleanup();
  push.mockReset();
  pathname = "/pos/123";
});

describe("BillingRedirect", () => {
  it("routes to /billing when a billing-required signal fires", () => {
    render(<BillingRedirect />);
    notifyBillingRequired("trial_expired");
    expect(push).toHaveBeenCalledWith("/billing");
  });

  it("does not redirect when the user is already on /billing", () => {
    pathname = "/billing";
    render(<BillingRedirect />);
    notifyBillingRequired("past_due");
    expect(push).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount (no navigation after the listener is gone)", () => {
    const { unmount } = render(<BillingRedirect />);
    unmount();
    notifyBillingRequired("trial_expired");
    expect(push).not.toHaveBeenCalled();
  });
});
