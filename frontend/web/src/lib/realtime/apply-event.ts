import type { FloorPlan, KitchenTicket, RealtimeEvent } from "@vendme/contracts";

type KitchenTicketEvent = Extract<RealtimeEvent, { type: "kitchen.ticket.updated" }>;
type TableChangedEvent = Extract<RealtimeEvent, { type: "table.changed" }>;

/**
 * Applies a kitchen-ticket delta to the active KDS board: updates the matching
 * ticket's status in place, then drops it once served (the board shows active
 * tickets only, mirroring the server's listTickets). Pure — this is the source
 * of truth for the delta-apply (ADR-0008) and is unit-tested. Pushing the
 * precise change here is the deliberate improvement over a blunt refetch.
 */
export function applyKdsEvent(
  tickets: KitchenTicket[],
  event: KitchenTicketEvent
): KitchenTicket[] {
  return tickets
    .map((t) => (t.id === event.ticketId ? { ...t, status: event.status } : t))
    .filter((t) => t.status !== "served");
}

/** Applies a table-status delta to the floor plan, in place. Pure. */
export function applyTableEvent(plan: FloorPlan, event: TableChangedEvent): FloorPlan {
  return {
    ...plan,
    tables: plan.tables.map((t) => (t.id === event.tableId ? { ...t, status: event.status } : t)),
  };
}
