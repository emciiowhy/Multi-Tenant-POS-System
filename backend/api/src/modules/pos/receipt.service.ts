import { and, eq } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import { notFound } from "../../lib/context.js";

/** Assembles the data a receipt is rendered from (formatting is a client concern). */
export async function getReceipt(companyId: string, orderClientUuid: string) {
  return withCompany(companyId, async (tx) => {
    const [order] = await tx
      .select()
      .from(tables.orders)
      .where(
        and(
          eq(tables.orders.companyId, companyId),
          eq(tables.orders.clientUuid, orderClientUuid),
        ),
      )
      .limit(1);
    if (!order) throw notFound("Order not found");

    const [lines, payments] = await Promise.all([
      tx
        .select()
        .from(tables.orderLines)
        .where(
          and(
            eq(tables.orderLines.companyId, companyId),
            eq(tables.orderLines.orderId, order.id),
          ),
        ),
      tx
        .select()
        .from(tables.payments)
        .where(
          and(
            eq(tables.payments.companyId, companyId),
            eq(tables.payments.orderId, order.id),
          ),
        ),
    ]);

    return {
      order: {
        id: order.id,
        status: order.status,
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        settledAt: order.settledAt,
      },
      lines,
      payments,
    };
  });
}
