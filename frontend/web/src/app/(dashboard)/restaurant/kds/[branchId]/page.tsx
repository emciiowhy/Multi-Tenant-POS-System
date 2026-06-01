"use client";

import { use } from "react";
import type { KdsStatus } from "@vendme/contracts";
import { useKdsTickets, useTransitionTicket } from "@/lib/restaurant/queries";
import { useRealtime } from "@/lib/realtime/use-realtime";

const COLUMNS: { status: KdsStatus; title: string; tint: string }[] = [
  { status: "queued", title: "Queued", tint: "border-neutral-400" },
  { status: "preparing", title: "Preparing", tint: "border-amber-500" },
  { status: "ready", title: "Ready", tint: "border-emerald-500" },
];

const NEXT_KDS: Partial<Record<KdsStatus, KdsStatus>> = {
  queued: "preparing",
  preparing: "ready",
  ready: "served",
};

const ADVANCE_LABEL: Partial<Record<KdsStatus, string>> = {
  queued: "Start",
  preparing: "Mark ready",
  ready: "Serve",
};

export default function KdsPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);
  useRealtime({ branchId, kds: true });

  const { data: tickets, isLoading, error } = useKdsTickets(branchId);
  const transition = useTransitionTicket();

  if (isLoading) return <Centered>Loading kitchen tickets…</Centered>;
  if (error) return <Centered>Couldn’t load the KDS: {(error as Error).message}</Centered>;

  const board = tickets ?? [];

  return (
    // KDS is a deliberately dark, high-contrast kitchen board (not theme-driven);
    // only the <main> landmark is reconciled into the shell here (slice 09). A
    // fuller primitive migration waits for the KDS module work to resume.
    <div className="bg-neutral-950 p-6 text-neutral-100">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Kitchen Display</h1>
        <span className="text-sm text-neutral-400">{board.length} active</span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = board.filter((t) => t.status === col.status);
          return (
            <section
              key={col.status}
              className={`rounded-lg border-t-4 ${col.tint} bg-neutral-900 p-3`}
            >
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
                {col.title} · {items.length}
              </h2>
              <ul className="flex flex-col gap-3">
                {items.map((t) => {
                  const next = NEXT_KDS[t.status];
                  return (
                    <li key={t.id} className="rounded-md bg-neutral-800 p-3">
                      <p className="font-mono text-xs text-neutral-400">
                        #{t.orderId.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-sm">
                        Fired {new Date(t.firedAt).toLocaleTimeString()}
                      </p>
                      {next && (
                        <button
                          onClick={() => transition.mutate({ ticketId: t.id, status: next })}
                          disabled={transition.isPending}
                          className="mt-2 rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {ADVANCE_LABEL[t.status]}
                        </button>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 && <li className="text-sm text-neutral-600">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-neutral-400">
      {children}
    </div>
  );
}
