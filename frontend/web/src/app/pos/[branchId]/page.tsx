"use client";

import { use, useState } from "react";
import { useCart } from "@/lib/pos/cart-store";
import { cartCount, cartSubtotal, moneyEquals } from "@/lib/pos/cart-logic";
import { useProducts, useReceipt } from "@/lib/pos/queries";
import {
  dismissSale,
  retrySync,
  useChargeSale,
  useOutboxEntry,
  useOutboxFailed,
  useOutboxPending,
} from "@/lib/pos/use-outbox";
import type { TenderMethod } from "@/lib/pos/build-sale-batch";
import { SaleReceipt, type ReceiptState } from "@/components/pos/sale-receipt";
import { AttentionBanner } from "@/components/pos/attention-banner";

const TENDERS: TenderMethod[] = ["cash", "card"];

interface ChargedSale {
  id: string;
  orderClientUuid: string;
  amount: string;
}

export default function PosPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);

  const { data: products, isLoading, error } = useProducts();
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);

  const { charge, pending } = useChargeSale(branchId);
  const pendingSync = useOutboxPending();
  const failures = useOutboxFailed();

  const [method, setMethod] = useState<TenderMethod>("cash");
  const [last, setLast] = useState<ChargedSale | null>(null);

  // Live state of the just-charged sale → provisional / confirmed / rejected.
  const entry = useOutboxEntry(last?.id ?? null);
  const receiptState: ReceiptState =
    entry?.status === "applied"
      ? "confirmed"
      : entry?.status === "failed"
        ? "rejected"
        : "provisional";
  const receipt = useReceipt(
    receiptState === "confirmed" && last ? last.orderClientUuid : null,
  );
  const mismatch =
    receiptState === "confirmed" && receipt.data && last
      ? !moneyEquals(receipt.data.order.grandTotal, last.amount)
      : false;

  const subtotal = cartSubtotal(items);

  async function onCharge() {
    if (items.length === 0) return;
    const amount = subtotal;
    const res = await charge(items, { method, amount });
    clear();
    setLast({ id: res.id, orderClientUuid: res.orderClientUuid, amount });
  }

  if (isLoading) return <Centered>Loading products…</Centered>;
  if (error) return <Centered>Couldn’t load products: {(error as Error).message}</Centered>;

  const active = (products ?? []).filter((p) => p.isActive);

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 bg-neutral-100 p-4 md:grid-cols-[1fr_360px] dark:bg-neutral-950">
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Register</h1>
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

        <AttentionBanner failures={failures} onDismiss={dismissSale} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {active.map((p) => (
            <button
              key={p.id}
              onClick={() => add({ productId: p.id, name: p.name, unitPrice: p.price })}
              className="flex h-24 flex-col justify-between rounded-lg border border-neutral-300 bg-white p-3 text-left shadow-sm hover:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-neutral-500">{p.price}</span>
            </button>
          ))}
          {active.length === 0 && (
            <p className="text-sm text-neutral-500">No products. Seed some first.</p>
          )}
        </div>
      </section>

      <aside className="flex flex-col rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Cart · {cartCount(items)}
        </h2>
        <ul className="flex-1 space-y-2 overflow-auto">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1 truncate">{i.name}</span>
              <input
                type="number"
                min={0}
                value={i.quantity}
                onChange={(e) => setQty(i.productId, Number(e.target.value))}
                className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-right dark:border-neutral-700 dark:bg-neutral-800"
              />
              <span className="w-16 text-right tabular-nums">{i.unitPrice}</span>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-neutral-500">Empty</li>}
        </ul>

        <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-neutral-500">Subtotal</span>
            <span className="text-lg font-semibold tabular-nums">{subtotal}</span>
          </div>
          <div className="mb-3 flex gap-2">
            {TENDERS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm capitalize ${
                  method === m
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={onCharge}
            disabled={items.length === 0 || pending}
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Charging…" : `Charge ${subtotal}`}
          </button>
        </div>
      </aside>

      {last && (
        <SaleReceipt
          state={receiptState}
          amount={last.amount}
          reason={entry?.reason}
          server={
            receipt.data
              ? { grandTotal: receipt.data.order.grandTotal, lines: receipt.data.lines }
              : undefined
          }
          mismatch={mismatch}
          onClose={() => setLast(null)}
        />
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-neutral-500">
      {children}
    </main>
  );
}
