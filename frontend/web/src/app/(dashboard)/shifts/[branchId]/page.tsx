"use client";

import { use, useEffect, useState } from "react";
import { useActiveShift } from "@/lib/pos/shift/active-shift";
import {
  useAddCashMovement,
  useCloseShift,
  useOpenShift,
  useRegisters,
  type CashReason,
} from "@/lib/pos/shift/queries";
import { CloseShiftResult } from "@/components/pos/close-shift-result";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const CASH_REASONS: { value: CashReason; label: string }[] = [
  { value: "pay_in", label: "Pay in" },
  { value: "pay_out", label: "Pay out" },
  { value: "drop", label: "Drop" },
];

// Shared token styling for the native <select> (no Select primitive in scope).
const SELECT_CLASS =
  "h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50";

export default function ShiftPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const shift = useActiveShift((s) => s.shift);
  const setShift = useActiveShift((s) => s.setShift);
  const clearShift = useActiveShift((s) => s.clearShift);

  const registers = useRegisters(branchId);
  const openShift = useOpenShift();
  const addCash = useAddCashMovement(shift?.id ?? "");
  const closeShift = useCloseShift(shift?.id ?? "");

  const [registerId, setRegisterId] = useState("");
  const [openingFloat, setOpeningFloat] = useState("0.00");
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState<CashReason>("pay_in");
  const [counted, setCounted] = useState("");
  const [closure, setClosure] = useState<
    { expected: string; counted: string; variance: string } | null
  >(null);

  async function onOpen() {
    if (!registerId) return;
    const s = await openShift.mutateAsync({ branchId, registerId, openingFloat });
    setShift({ id: s.id, branchId, registerId, openingFloat: s.openingFloat });
  }

  async function onAddCash() {
    if (!cashAmount) return;
    // Pay-outs/drops leave the drawer, so they're recorded as negative movements.
    const amount = cashReason === "pay_in" ? cashAmount : `-${cashAmount}`;
    await addCash.mutateAsync({ amount, reason: cashReason });
    setCashAmount("");
  }

  async function onClose() {
    if (!counted) return;
    const result = await closeShift.mutateAsync({ counted });
    setClosure({ expected: result.expected, counted: result.counted, variance: result.variance });
  }

  if (!mounted) return <Centered>Loading…</Centered>;

  return (
    <div className="mx-auto max-w-md p-6">
      {!shift ? (
        <section className="rounded-card border border-border bg-surface p-5 shadow-card">
          <h1 className="mb-4 text-xl font-semibold text-fg">Open shift</h1>
          <label className="mb-1 block text-sm text-fg-muted">Register</label>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className={`mb-3 w-full ${SELECT_CLASS}`}
          >
            <option value="">
              {registers.isLoading ? "Loading registers…" : "Select a register"}
            </option>
            {(registers.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Input
            label="Opening float"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            inputMode="decimal"
            className="w-full text-right tabular-nums"
          />
          <Button
            fullWidth
            className="mt-4"
            onClick={onOpen}
            disabled={!registerId}
            loading={openShift.isPending}
          >
            {openShift.isPending ? "Opening…" : "Open shift"}
          </Button>
          {openShift.error && (
            <p className="mt-2 text-sm text-danger">{(openShift.error as Error).message}</p>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <header className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h1 className="text-xl font-semibold text-fg">Shift open</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Opening float <span className="tabular-nums">{shift.openingFloat}</span>
            </p>
          </header>

          <div className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-fg-muted">
              Cash movement
            </h2>
            <div className="flex gap-2">
              <select
                value={cashReason}
                onChange={(e) => setCashReason(e.target.value as CashReason)}
                className={SELECT_CLASS}
              >
                {CASH_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-right tabular-nums text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50"
              />
              <Button onClick={onAddCash} disabled={!cashAmount} loading={addCash.isPending}>
                Add
              </Button>
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-fg-muted">
              Close shift
            </h2>
            <Input
              label="Counted in drawer"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full text-right tabular-nums"
            />
            <Button
              variant="danger"
              fullWidth
              className="mt-3"
              onClick={onClose}
              disabled={!counted}
              loading={closeShift.isPending}
            >
              {closeShift.isPending ? "Closing…" : "Close shift"}
            </Button>
          </div>
        </section>
      )}

      {closure && (
        <CloseShiftResult
          expected={closure.expected}
          counted={closure.counted}
          variance={closure.variance}
          onDone={() => {
            clearShift();
            setClosure(null);
            setCounted("");
          }}
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
