"use client";

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

const PILL: Record<ReceiptState, { label: string; cls: string }> = {
  provisional: { label: "Pending sync", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  confirmed: { label: "Synced", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

/**
 * The sale outcome overlay. Provisional (offline, client amount) → Synced
 * (server-authoritative totals) → or Rejected (needs attention). A
 * tendered-vs-server total difference is flagged for reconciliation.
 */
export function SaleReceipt({ state, amount, reason, server, mismatch, onClose }: SaleReceiptProps) {
  const pill = PILL[state];
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-neutral-900">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">Receipt</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill.cls}`}>
            {pill.label}
          </span>
        </div>

        {state === "confirmed" && server ? (
          <>
            <ul className="my-3 space-y-1 text-sm">
              {server.lines.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span>
                    {l.quantity} × {l.unitPrice}
                  </span>
                  <span className="tabular-nums">{l.lineTotal}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-800">
              <span>Total</span>
              <span className="tabular-nums">{server.grandTotal}</span>
            </div>
            {mismatch && (
              <p className="mt-2 rounded bg-amber-500/15 p-2 text-xs text-amber-700 dark:text-amber-400">
                Total changed on sync (tendered {amount}) — flagged for reconciliation.
              </p>
            )}
          </>
        ) : state === "rejected" ? (
          <p className="my-3 rounded bg-red-500/15 p-2 text-sm text-red-700 dark:text-red-400">
            Needs attention: {reason ?? "sale rejected by the server"}.
          </p>
        ) : (
          <div className="my-3 flex justify-between font-semibold">
            <span>Charged</span>
            <span className="tabular-nums">{amount}</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          New sale
        </button>
      </div>
    </div>
  );
}
