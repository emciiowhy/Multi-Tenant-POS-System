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

const CASH_REASONS: { value: CashReason; label: string }[] = [
  { value: "pay_in", label: "Pay in" },
  { value: "pay_out", label: "Pay out" },
  { value: "drop", label: "Drop" },
];

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
    <main className="mx-auto max-w-md p-6">
      {!shift ? (
        <section className="rounded-lg border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="mb-4 text-xl font-semibold">Open shift</h1>
          <label className="mb-1 block text-sm text-neutral-500">Register</label>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
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
          <label className="mb-1 block text-sm text-neutral-500">Opening float</label>
          <input
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            inputMode="decimal"
            className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            onClick={onOpen}
            disabled={!registerId || openShift.isPending}
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {openShift.isPending ? "Opening…" : "Open shift"}
          </button>
          {openShift.error && (
            <p className="mt-2 text-sm text-red-600">{(openShift.error as Error).message}</p>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <header className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="text-xl font-semibold">Shift open</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Opening float <span className="tabular-nums">{shift.openingFloat}</span>
            </p>
          </header>

          <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              Cash movement
            </h2>
            <div className="flex gap-2">
              <select
                value={cashReason}
                onChange={(e) => setCashReason(e.target.value as CashReason)}
                className="rounded-md border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
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
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
              />
              <button
                onClick={onAddCash}
                disabled={!cashAmount || addCash.isPending}
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
              Close shift
            </h2>
            <label className="mb-1 block text-sm text-neutral-500">Counted in drawer</label>
            <input
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
            />
            <button
              onClick={onClose}
              disabled={!counted || closeShift.isPending}
              className="w-full rounded-md bg-red-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {closeShift.isPending ? "Closing…" : "Close shift"}
            </button>
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
