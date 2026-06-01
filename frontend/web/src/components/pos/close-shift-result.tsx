"use client";

import { varianceLabel } from "@/lib/pos/shift/shift-logic";
import { Button } from "@/components/ui/Button";

export interface CloseShiftResultProps {
  expected: string;
  counted: string;
  variance: string;
  onDone: () => void;
}

// Variance tone, token-driven (slice 09): balanced = good, over = notable,
// short = bad. The label text itself is the source of truth; color is decoration.
const TONE: Record<ReturnType<typeof varianceLabel>, string> = {
  balanced: "text-success",
  over: "text-warning",
  short: "text-danger",
};

/** Drawer reconciliation summary shown after closing a shift. */
export function CloseShiftResult({ expected, counted, variance, onDone }: CloseShiftResultProps) {
  const label = varianceLabel(variance);
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-lg font-semibold text-fg">Shift closed</h3>
        <dl className="space-y-1 text-sm">
          <Row term="Expected" value={expected} />
          <Row term="Counted" value={counted} />
          <Row term="Variance" value={variance} />
        </dl>
        <p className={`mt-3 text-sm font-medium capitalize ${TONE[label]}`}>{label}</p>
        <Button fullWidth onClick={onDone} className="mt-4">
          Done
        </Button>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="tabular-nums text-fg">{value}</dd>
    </div>
  );
}
