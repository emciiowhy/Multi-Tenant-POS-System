import { and, eq, inArray } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import type { CompanyTx } from "@vendme/db";
import type { KdsStatus, KitchenTicket } from "@vendme/contracts";
import { badRequest, notFound } from "../../lib/context.js";
import { realtimeBus } from "../../realtime/bus.js";
import { isValidKdsTransition } from "./kds.logic.js";

/** Statuses shown on the live KDS screen (served tickets fall off the board). */
const ACTIVE: KdsStatus[] = ["queued", "preparing", "ready"];

type TicketRow = typeof tables.kitchenTickets.$inferSelect;

function toDto(row: TicketRow): KitchenTicket {
  return {
    id: row.id,
    orderId: row.orderId,
    branchId: row.branchId,
    status: row.status as KdsStatus,
    firedAt: row.firedAt.toISOString(),
    readyAt: row.readyAt ? row.readyAt.toISOString() : null,
  };
}

/** Active tickets for a branch's Kitchen Display, oldest first. */
export async function listTickets(
  companyId: string,
  branchId: string,
): Promise<KitchenTicket[]> {
  return withCompany(companyId, async (tx: CompanyTx) => {
    const rows = await tx
      .select()
      .from(tables.kitchenTickets)
      .where(
        and(
          eq(tables.kitchenTickets.companyId, companyId),
          eq(tables.kitchenTickets.branchId, branchId),
          inArray(tables.kitchenTickets.status, ACTIVE),
        ),
      )
      .orderBy(tables.kitchenTickets.firedAt);
    return rows.map(toDto);
  });
}

/**
 * Advances a ticket to a later lifecycle stage and broadcasts the change to the
 * branch's KDS room. The transition is validated (forward-only) and `readyAt`
 * is stamped on reaching "ready". The realtime delta is published only after
 * the transaction commits (ADR-0006).
 */
export async function transitionTicket(
  companyId: string,
  ticketId: string,
  toStatus: KdsStatus,
): Promise<KitchenTicket> {
  const ticket = await withCompany(companyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(tables.kitchenTickets)
      .where(
        and(
          eq(tables.kitchenTickets.companyId, companyId),
          eq(tables.kitchenTickets.id, ticketId),
        ),
      )
      .limit(1);
    if (!row) throw notFound("Kitchen ticket not found");

    const from = row.status as KdsStatus;
    if (!isValidKdsTransition(from, toStatus)) {
      throw badRequest(`Illegal KDS transition: ${from} → ${toStatus}`);
    }

    const [updated] = await tx
      .update(tables.kitchenTickets)
      .set({
        status: toStatus,
        readyAt: toStatus === "ready" ? new Date() : row.readyAt,
      })
      .where(
        and(
          eq(tables.kitchenTickets.companyId, companyId),
          eq(tables.kitchenTickets.id, ticketId),
        ),
      )
      .returning();
    return updated!;
  });

  realtimeBus.publish({
    companyId,
    branchId: ticket.branchId,
    event: { type: "kitchen.ticket.updated", ticketId: ticket.id, status: toStatus },
  });

  return toDto(ticket);
}
