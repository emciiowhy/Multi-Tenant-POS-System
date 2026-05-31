"use client";

import { use, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecentOrders, useRefund, type RecentOrder } from "@/lib/pos/returns/queries";
import { retrySync, useOutboxEntry, useOutboxPending } from "@/lib/pos/use-outbox";

export default function ReturnsPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);

  const orders = useRecentOrders(branchId);
  const { refund, pending } = useRefund();
  const pendingSync = useOutboxPending();
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
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Returns</h1>
        {pendingSync > 0 && (
          <button
            onClick={retrySync}
            title="Retry sync now"
            className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-600 hover:bg-amber-500/25 dark:text-amber-400"
          >
            Pending sync · {pendingSync} · Retry
          </button>
        )}
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
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-neutral-500">#{o.id.slice(0, 8)}</p>
              <p className="text-sm">
                <span className="tabular-nums font-medium">{o.grandTotal}</span>{" "}
                <span className="text-neutral-500">· {o.status}</span>
              </p>
            </div>
            {o.status === "settled" ? (
              <button
                onClick={() => startRefund(o)}
                className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:border-neutral-900 dark:border-neutral-700"
              >
                Refund
              </button>
            ) : o.status === "refunded" ? (
              <span className="shrink-0 rounded-full bg-neutral-500/15 px-2 py-0.5 text-xs text-neutral-500">
                refunded
              </span>
            ) : null}
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-neutral-500">No orders yet.</li>}
      </ul>

      {refunding && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-neutral-900">
            <h3 className="mb-3 text-lg font-semibold">Refund</h3>
            <label className="mb-1 block text-sm text-neutral-500">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRefunding(null)}
                className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={!amount || pending}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "Refunding…" : `Refund ${amount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
      ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : status === "failed"
        ? "border-red-300 bg-red-500/10 text-red-700 dark:text-red-400"
        : "border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  const text =
    status === "applied"
      ? `Refunded ${amount}`
      : status === "failed"
        ? `Refund rejected: ${reason ?? "unknown"}`
        : `Refund ${amount} — pending sync`;
  return (
    <div className={`mb-4 flex items-center justify-between rounded-lg border p-3 text-sm ${tone}`}>
      <span>{text}</span>
      <button onClick={onClose} className="text-xs underline">
        dismiss
      </button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-neutral-500">
      {children}
    </main>
  );
}
