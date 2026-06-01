"use client";

import { use, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecentOrders, useRefund, type RecentOrder } from "@/lib/pos/returns/queries";
import { useOutboxEntry } from "@/lib/pos/use-outbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function ReturnsPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);

  const orders = useRecentOrders(branchId);
  const { refund, pending } = useRefund();
  const queryClient = useQueryClient();

  const [refunding, setRefunding] = useState<{ orderClientUuid: string; grandTotal: string } | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [last, setLast] = useState<{ id: string; amount: string } | null>(null);
  const lastEntry = useOutboxEntry(last?.id ?? null);

  function startRefund(order: RecentOrder) {
    setRefunding({ orderClientUuid: order.clientUuid, grandTotal: order.grandTotal });
    setAmount(order.grandTotal);
  }

  async function confirmRefund() {
    if (!refunding || !amount) return;
    const res = await refund(refunding.orderClientUuid, amount);
    setLast({ id: res.id, amount });
    setRefunding(null);
    setAmount("");
    void queryClient.invalidateQueries({ queryKey: ["recent-orders", branchId] });
  }

  if (orders.isLoading) return <Centered>Loading orders…</Centered>;
  if (orders.error)
    return <Centered>Couldn’t load orders: {(orders.error as Error).message}</Centered>;

  const rows = orders.data ?? [];

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Queued-sync state now lives once in the shell header OfflineIndicator
          (slice 07/09) — no per-page pending pill. */}
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-fg">Returns</h1>
      </header>

      {last && (
        <RefundStatus
          amount={last.amount}
          status={lastEntry?.status}
          reason={lastEntry?.reason}
          onClose={() => setLast(null)}
        />
      )}

      <ul className="space-y-2">
        {rows.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 shadow-card"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-fg-muted">#{o.id.slice(0, 8)}</p>
              <p className="text-sm text-fg">
                <span className="tabular-nums font-medium">{o.grandTotal}</span>{" "}
                <span className="text-fg-muted">· {o.status}</span>
              </p>
            </div>
            {o.status === "settled" ? (
              <Button variant="outline" size="sm" onClick={() => startRefund(o)}>
                Refund
              </Button>
            ) : o.status === "refunded" ? (
              <Badge>refunded</Badge>
            ) : null}
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-fg-muted">No orders yet.</li>}
      </ul>

      {refunding && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="mb-3 text-lg font-semibold text-fg">Refund</h3>
            <Input
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-full text-right tabular-nums"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRefunding(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={confirmRefund}
                disabled={!amount}
                loading={pending}
              >
                {pending ? "Refunding…" : `Refund ${amount}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RefundStatus({
  amount,
  status,
  reason,
  onClose,
}: {
  amount: string;
  status?: "pending" | "applied" | "failed";
  reason?: string;
  onClose: () => void;
}) {
  const tone =
    status === "applied"
      ? "border-success/40 bg-success-bg text-success"
      : status === "failed"
        ? "border-danger/40 bg-danger-bg text-danger"
        : "border-warning/40 bg-warning-bg text-warning";
  const text =
    status === "applied"
      ? `Refunded ${amount}`
      : status === "failed"
        ? `Refund rejected: ${reason ?? "unknown"}`
        : `Refund ${amount} — pending sync`;
  return (
    <div className={`mb-4 flex items-center justify-between rounded-card border p-3 text-sm ${tone}`}>
      <span>{text}</span>
      <button type="button" onClick={onClose} className="text-xs underline">
        dismiss
      </button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-fg-muted">
      {children}
    </div>
  );
}
