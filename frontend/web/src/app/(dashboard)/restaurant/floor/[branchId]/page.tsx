"use client";

import { use } from "react";
import type { TableStatus } from "@vendme/contracts";
import { useFloorPlan, useTransitionTable } from "@/lib/restaurant/queries";
import { useRealtime } from "@/lib/realtime/use-realtime";

// Floor-plan table states need four distinct hues for an at-a-glance legend —
// a domain visualization that intentionally sits outside the 4 semantic UI
// tokens (which have no blue/fuchsia). Kept as a deliberate domain palette.
const STATUS_COLOR: Record<TableStatus, string> = {
  free: "bg-emerald-600",
  seated: "bg-sky-600",
  ordered: "bg-amber-600",
  bill: "bg-fuchsia-700",
};

/** Clicking a table advances it to the next state (the server validates it). */
const NEXT_TABLE: Record<TableStatus, TableStatus> = {
  free: "seated",
  seated: "ordered",
  ordered: "bill",
  bill: "free",
};

export default function FloorPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);
  useRealtime({ branchId });

  const { data: plan, isLoading, error } = useFloorPlan(branchId);
  const transition = useTransitionTable();

  if (isLoading) return <Centered>Loading floor plan…</Centered>;
  if (error) return <Centered>Couldn’t load the floor: {(error as Error).message}</Centered>;
  if (!plan) return <Centered>No floor plan.</Centered>;

  const sections: { id: string | null; name: string }[] = [
    ...plan.sections.map((s) => ({ id: s.id, name: s.name })),
    { id: null, name: "Unassigned" },
  ];

  return (
    <div className="p-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-fg">Floor plan</h1>
        <Legend />
      </header>

      <div className="flex flex-col gap-8">
        {sections.map((section) => {
          const tables = plan.tables.filter((t) => t.sectionId === section.id);
          if (tables.length === 0) return null;
          return (
            <section key={section.id ?? "unassigned"}>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-fg-muted">
                {section.name}
              </h2>
              <div className="relative h-80 w-full overflow-hidden rounded-card border border-border bg-surface">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      transition.mutate({ tableId: t.id, status: NEXT_TABLE[t.status] })
                    }
                    disabled={transition.isPending}
                    title={`${t.label} · ${t.status} · seats ${t.seats}`}
                    style={{
                      position: "absolute",
                      left: t.posX,
                      top: t.posY,
                      width: t.width,
                      height: t.height,
                      borderRadius: t.shape === "circle" ? "9999px" : "0.5rem",
                    }}
                    className={`flex flex-col items-center justify-center text-xs font-medium text-white shadow transition-colors disabled:opacity-60 ${STATUS_COLOR[t.status]}`}
                  >
                    <span>{t.label}</span>
                    <span className="opacity-80">{t.status}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  const statuses: TableStatus[] = ["free", "seated", "ordered", "bill"];
  return (
    <div className="flex gap-3 text-xs text-fg-muted">
      {statuses.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded ${STATUS_COLOR[s]}`} /> {s}
        </span>
      ))}
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
