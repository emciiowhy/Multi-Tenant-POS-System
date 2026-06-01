"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BadgeVariant } from "@/lib/ui/badge-variant";

export type ReceiptState = "provisional" | "confirmed" | "rejected";

export interface ServerReceipt {
  grandTotal: string;
  lines: { id: string; quantity: string; unitPrice: string; lineTotal: string }[];
}

export interface SaleReceiptProps {
  state: ReceiptState;
  /** The client-computed/tendered amount (shown while provisional). */
  amount: string;
  reason?: string;
  server?: ServerReceipt;
  mismatch?: boolean;
  onClose: () => void;
}

const PILL: Record<ReceiptState, { label: string; variant: BadgeVariant }> = {
  provisional: { label: "Pending sync", variant: "warning" },
  confirmed: { label: "Synced", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

/**
 * The sale outcome overlay. Provisional (offline, client amount) → Synced
 * (server-authoritative totals) → or Rejected (needs attention). A
 * tendered-vs-server total difference is flagged for reconciliation.
 * Token-driven + on the shared primitives (slice 09).
 */
export function SaleReceipt({ state, amount, reason, server, mismatch, onClose }: SaleReceiptProps) {
  const pill = PILL[state];
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-fg">Receipt</h3>
          <Badge variant={pill.variant}>{pill.label}</Badge>
        </div>

        {state === "confirmed" && server ? (
          <>
            <ul className="my-3 space-y-1 text-sm text-fg">
              {server.lines.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span>
                    {l.quantity} × {l.unitPrice}
                  </span>
                  <span className="tabular-nums">{l.lineTotal}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-fg">
              <span>Total</span>
              <span className="tabular-nums">{server.grandTotal}</span>
            </div>
            {mismatch && (
              <p className="mt-2 rounded-md bg-warning-bg p-2 text-xs text-warning">
                Total changed on sync (tendered {amount}) — flagged for reconciliation.
              </p>
            )}
          </>
        ) : state === "rejected" ? (
          <p className="my-3 rounded-md bg-danger-bg p-2 text-sm text-danger">
            Needs attention: {reason ?? "sale rejected by the server"}.
          </p>
        ) : (
          <div className="my-3 flex justify-between font-semibold text-fg">
            <span>Charged</span>
            <span className="tabular-nums">{amount}</span>
          </div>
        )}

        <Button fullWidth onClick={onClose} className="mt-4">
          New sale
        </Button>
      </div>
    </div>
  );
}
