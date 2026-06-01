"use client";

import { use, useState } from "react";
import { useCart } from "@/lib/pos/cart-store";
import { cartCount, cartSubtotal, moneyEquals } from "@/lib/pos/cart-logic";
import { useProducts, useReceipt } from "@/lib/pos/queries";
import {
  dismissSale,
  useChargeSale,
  useOutboxEntry,
  useOutboxFailed,
} from "@/lib/pos/use-outbox";
import type { TenderMethod } from "@/lib/pos/build-sale-batch";
import { SaleReceipt, type ReceiptState } from "@/components/pos/sale-receipt";
import { AttentionBanner } from "@/components/pos/attention-banner";
import { Button } from "@/components/ui/Button";
import { DataGridCard } from "@/components/ui/DataGridCard";
import { useActionLock } from "@/components/ui/Interceptors";

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
  const failures = useOutboxFailed();
  // Shell-wide soft-lock: a subscription lockout freezes checkout with a reason
  // (slice 07); offline does NOT lock — sales queue and replay (offline-first).
  const lock = useActionLock();

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
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_360px]">
      <section>
        <header className="mb-3">
          <h1 className="text-xl font-semibold text-fg">Register</h1>
        </header>

        <AttentionBanner failures={failures} onDismiss={dismissSale} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {active.map((p) => (
            <DataGridCard
              key={p.id}
              onClick={() => add({ productId: p.id, name: p.name, unitPrice: p.price })}
              className="h-24 justify-between"
            >
              <span className="font-medium text-fg">{p.name}</span>
              <span className="text-sm text-fg-muted">{p.price}</span>
            </DataGridCard>
          ))}
          {active.length === 0 && (
            <p className="text-sm text-fg-muted">No products. Seed some first.</p>
          )}
        </div>
      </section>

      <aside className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-fg-muted">
          Cart · {cartCount(items)}
        </h2>
        <ul className="flex-1 space-y-2 overflow-auto">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1 truncate text-fg">{i.name}</span>
              <input
                type="number"
                min={0}
                value={i.quantity}
                onChange={(e) => setQty(i.productId, Number(e.target.value))}
                className="w-14 rounded-md border border-border bg-surface px-1 py-0.5 text-right tabular-nums text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              />
              <span className="w-16 text-right tabular-nums text-fg">{i.unitPrice}</span>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-fg-muted">Empty</li>}
        </ul>

        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-fg-muted">Subtotal</span>
            <span className="text-lg font-semibold tabular-nums text-fg">{subtotal}</span>
          </div>
          <div className="mb-3 flex gap-2">
            {TENDERS.map((m) => (
              <Button
                key={m}
                variant={method === m ? "primary" : "outline"}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <Button
            variant="primary"
            fullWidth
            loading={pending}
            disabled={items.length === 0}
            blockedReason={lock.reason}
            onClick={onCharge}
          >
            {pending ? "Charging…" : `Charge ${subtotal}`}
          </Button>
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
