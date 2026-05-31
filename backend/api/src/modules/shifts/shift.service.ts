import { and, eq } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import { badRequest, notFound } from "../../lib/context.js";
import { computeExpectedDrawer, drawerVariance } from "./shift.logic.js";
import { realtimeBus } from "../../realtime/bus.js";

export async function openShift(
  companyId: string,
  input: { branchId: string; registerId: string; openingFloat: string; accountId: string },
) {
  const row = await withCompany(companyId, async (tx) => {
    const [inserted] = await tx
      .insert(tables.shifts)
      .values({
        companyId,
        branchId: input.branchId,
        registerId: input.registerId,
        openedByAccountId: input.accountId,
        openingFloat: input.openingFloat,
        status: "open",
      })
      .returning();
    return inserted!;
  });

  realtimeBus.publish({
    companyId,
    branchId: row.branchId,
    event: { type: "shift.opened", shiftId: row.id, registerId: row.registerId },
  });

  return row;
}

export async function addCashMovement(
  companyId: string,
  shiftId: string,
  input: { amount: string; reason: string },
) {
  return withCompany(companyId, async (tx) => {
    const [shift] = await tx
      .select({ status: tables.shifts.status })
      .from(tables.shifts)
      .where(and(eq(tables.shifts.companyId, companyId), eq(tables.shifts.id, shiftId)))
      .limit(1);
    if (!shift) throw notFound("Shift not found");
    if (shift.status !== "open") throw badRequest("Shift is closed");

    const [row] = await tx
      .insert(tables.cashMovements)
      .values({ companyId, shiftId, amount: input.amount, reason: input.reason })
      .returning();
    return row!;
  });
}

export interface ShiftClosure {
  shiftId: string;
  openingFloat: string;
  expected: string;
  counted: string;
  variance: string;
}

/** Closes a shift and reconciles the drawer (ADR-0006 fixed-point math). */
export async function closeShift(
  companyId: string,
  shiftId: string,
  counted: string,
): Promise<ShiftClosure> {
  const { closure, branchId, registerId } = await withCompany(companyId, async (tx) => {
    const [shift] = await tx
      .select()
      .from(tables.shifts)
      .where(and(eq(tables.shifts.companyId, companyId), eq(tables.shifts.id, shiftId)))
      .limit(1);
    if (!shift) throw notFound("Shift not found");
    if (shift.status !== "open") throw badRequest("Shift already closed");

    const movements = await tx
      .select({ amount: tables.cashMovements.amount })
      .from(tables.cashMovements)
      .where(
        and(
          eq(tables.cashMovements.companyId, companyId),
          eq(tables.cashMovements.shiftId, shiftId),
        ),
      );

    const expected = computeExpectedDrawer(
      shift.openingFloat,
      movements.map((m) => m.amount),
    );
    const variance = drawerVariance(counted, expected);

    await tx
      .update(tables.shifts)
      .set({ status: "closed", closingCounted: counted, closedAt: new Date() })
      .where(eq(tables.shifts.id, shiftId));

    return {
      closure: {
        shiftId,
        openingFloat: shift.openingFloat,
        expected,
        counted,
        variance,
      },
      branchId: shift.branchId,
      registerId: shift.registerId,
    };
  });

  realtimeBus.publish({
    companyId,
    branchId,
    event: { type: "shift.closed", shiftId, registerId },
  });

  return closure;
}
