"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { FloorPlan, KitchenTicket } from "@vendme/contracts";
import { connectRealtime } from "./socket";
import { applyKdsEvent, applyTableEvent } from "./apply-event";

export interface RealtimeOptions {
  branchId: string;
  /** Also join the KDS room (kitchen screens). */
  kds?: boolean;
}

/**
 * Subscribes to the current branch's realtime room and applies each delta
 * directly into the TanStack Query cache (ADR-0008) — precise `setQueryData`,
 * never a blunt invalidate-and-refetch.
 *
 * The single exception is a kitchen ticket we've never seen (a freshly fired
 * order): the lean event can't carry the whole ticket, so we materialise it
 * with one targeted invalidate. Every other delta is applied in place.
 */
export function useRealtime({ branchId, kds = false }: RealtimeOptions): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectRealtime();

    // (Re)subscribe on every connect — rooms are dropped on disconnect.
    socket.on("connect", () => {
      socket.emit("subscribe", { branchId, kds }, () => {});
    });

    socket.on("sync", (event) => {
      if (event.type === "kitchen.ticket.updated") {
        const key = ["kds", branchId];
        const current = queryClient.getQueryData<KitchenTicket[]>(key);
        if (current?.some((t) => t.id === event.ticketId)) {
          queryClient.setQueryData<KitchenTicket[]>(key, (old) =>
            old ? applyKdsEvent(old, event) : old,
          );
        } else {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      } else if (event.type === "table.changed") {
        queryClient.setQueryData<FloorPlan>(["floor", branchId], (plan) =>
          plan ? applyTableEvent(plan, event) : plan,
        );
      }
      // order.fired / stock.changed / shift.* aren't consumed by these screens.
    });

    return () => {
      socket.disconnect();
    };
  }, [branchId, kds, queryClient]);
}
