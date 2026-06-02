// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SaleReceipt } from "./sale-receipt";

afterEach(cleanup);

describe("SaleReceipt", () => {
  it("shows a provisional (pending sync) receipt with the client amount", () => {
    render(<SaleReceipt state="provisional" amount="23.0000" onClose={() => {}} />);
    expect(screen.getByText(/pending sync/i)).toBeTruthy();
    expect(screen.getByText("23.0000")).toBeTruthy();
  });

  it("shows the confirmed server total when synced", () => {
    render(
      <SaleReceipt
        state="confirmed"
        amount="23.0000"
        server={{ grandTotal: "23.0000", lines: [] }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/synced/i)).toBeTruthy();
    expect(screen.getByText("23.0000")).toBeTruthy();
  });

  it("flags a total mismatch for reconciliation", () => {
    render(
      <SaleReceipt
        state="confirmed"
        amount="23.0000"
        server={{ grandTotal: "20.0000", lines: [] }}
        mismatch
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/reconcil/i)).toBeTruthy();
  });

  it("surfaces the rejection reason", () => {
    render(
      <SaleReceipt state="rejected" amount="23.0000" reason="unknown product" onClose={() => {}} />
    );
    expect(screen.getByText(/rejected/i)).toBeTruthy();
    expect(screen.getByText(/unknown product/i)).toBeTruthy();
  });

  it("calls onClose when dismissed", () => {
    const onClose = vi.fn();
    render(<SaleReceipt state="provisional" amount="1.0000" onClose={onClose} />);
    screen.getByRole("button").click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
