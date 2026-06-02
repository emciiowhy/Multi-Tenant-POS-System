"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  FloorPlan,
  FloorTable,
  KdsStatus,
  KitchenTicket,
  TableStatus,
} from "@vendme/contracts";
import { apiFetch } from "@/lib/api";

/** Active KDS tickets for a branch. Updated live by the delta-sync hook. */
export function useKdsTickets(branchId: string) {
  return useQuery({
    queryKey: ["kds", branchId],
    queryFn: () => apiFetch<KitchenTicket[]>(`/v1/restaurant/kds/${branchId}/tickets`),
  });
}

/** The interactive floor plan for a branch. Updated live by the delta-sync hook. */
export function useFloorPlan(branchId: string) {
  return useQuery({
    queryKey: ["floor", branchId],
    queryFn: () => apiFetch<FloorPlan>(`/v1/restaurant/floor/${branchId}`),
  });
}

/**
 * Advances a kitchen ticket. The cache is NOT written here: the server emits
 * `kitchen.ticket.updated` to the KDS room, which the delta-sync hook applies —
 * so the acting client and every other screen converge through one path.
 */
export function useTransitionTicket() {
  return useMutation({
    mutationFn: (vars: { ticketId: string; status: KdsStatus }) =>
      apiFetch<KitchenTicket>(`/v1/restaurant/kds/tickets/${vars.ticketId}/transition`, {
        method: "POST",
        body: JSON.stringify({ status: vars.status }),
      }),
  });
}

/** Moves a table through its lifecycle; the `table.changed` echo updates caches. */
export function useTransitionTable() {
  return useMutation({
    mutationFn: (vars: { tableId: string; status: TableStatus }) =>
      apiFetch<FloorTable>(`/v1/restaurant/tables/${vars.tableId}/transition`, {
        method: "POST",
        body: JSON.stringify({ status: vars.status }),
      }),
  });
}
