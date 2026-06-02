"use client";

import { use, useMemo, useState } from "react";
import { useCart } from "@/lib/pos/cart-store";
import { cartCount, cartSubtotal, moneyEquals } from "@/lib/pos/cart-logic";
import { useProducts, useReceipt } from "@/lib/pos/queries";
import { dismissSale, useChargeSale, useOutboxEntry, useOutboxFailed } from "@/lib/pos/use-outbox";
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
  const receipt = useReceipt(receiptState === "confirmed" && last ? last.orderClientUuid : null);
  const mismatch =
    receiptState === "confirmed" && receipt.data && last
      ? !moneyEquals(receipt.data.order.grandTotal, last.amount)
      : false;

  const subtotal = cartSubtotal(items);

  // Per-product quantity already in the cart, so each tile reflects its own state
  // (count badge + selected ring) the instant it's tapped. Declared before the
  // early returns below so the hook order stays stable (rules-of-hooks).
  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.productId, i.quantity);
    return map;
  }, [items]);

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
          {active.map((p) => {
            const inCart = qtyById.get(p.id) ?? 0;
            return (
              <DataGridCard
                key={p.id}
                selected={inCart > 0}
                onClick={() => add({ productId: p.id, name: p.name, unitPrice: p.price })}
                className="relative h-24 justify-between"
              >
                {inCart > 0 && (
                  <span
                    aria-label={`${inCart} in cart`}
                    className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold tabular-nums text-brand-foreground"
                  >
                    {inCart}
                  </span>
                )}
                <span className="font-medium text-fg">{p.name}</span>
                <span className="text-sm text-fg-muted">{p.price}</span>
              </DataGridCard>
            );
          })}
          {active.length === 0 && (
            <p className="text-sm text-fg-muted">No products. Seed some first.</p>
          )}
        </div>
      </section>

      <aside className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-fg-muted">
          Cart · {cartCount(items)}
        </h2>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <ShoppingBagIcon className="h-10 w-10 text-fg-muted/50" />
            <p className="max-w-[14rem] text-sm text-fg-muted">
              Scan products or tap tiles to build an order
            </p>
          </div>
        ) : (
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
          </ul>
        )}

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

/** Inline bag glyph for the empty-cart state (lucide-react isn't a dependency;
 *  the app uses inline SVGs). Inherits color via `currentColor`. */
function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 7h12l-1 12.2A2 2 0 0 1 15 21H9a2 2 0 0 1-2-1.8L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
