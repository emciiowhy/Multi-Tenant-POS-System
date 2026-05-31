"use client";

import { varianceLabel } from "@/lib/pos/shift/shift-logic";

export interface CloseShiftResultProps {
  expected: string;
  counted: string;
  variance: string;
  onDone: () => void;
}

const TONE: Record<ReturnType<typeof varianceLabel>, string> = {
  balanced: "text-emerald-600 dark:text-emerald-400",
  over: "text-sky-600 dark:text-sky-400",
  short: "text-red-600 dark:text-red-400",
};

/** Drawer reconciliation summary shown after closing a shift. */
export function CloseShiftResult({ expected, counted, variance, onDone }: CloseShiftResultProps) {
  const label = varianceLabel(variance);
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-neutral-900">
        <h3 className="mb-3 text-lg font-semibold">Shift closed</h3>
        <dl className="space-y-1 text-sm">
          <Row term="Expected" value={expected} />
          <Row term="Counted" value={counted} />
          <Row term="Variance" value={variance} />
        </dl>
        <p className={`mt-3 text-sm font-medium capitalize ${TONE[label]}`}>{label}</p>
        <button
          onClick={onDone}
          className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{term}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
