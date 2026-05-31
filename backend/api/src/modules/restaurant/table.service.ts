import { and, eq } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import type {
  FloorPlan,
  FloorSection,
  FloorTable,
  TableShape,
  TableStatus,
} from "@vendme/contracts";
import { badRequest, notFound } from "../../lib/context.js";
import { realtimeBus } from "../../realtime/bus.js";
import { isValidTableTransition } from "./table.logic.js";

type TableRow = typeof tables.tables.$inferSelect;
type SectionRow = typeof tables.floorSections.$inferSelect;

function toTableDto(row: TableRow): FloorTable {
  return {
    id: row.id,
    branchId: row.branchId,
    sectionId: row.sectionId,
    label: row.label,
    seats: row.seats,
    status: row.status as TableStatus,
    posX: row.posX,
    posY: row.posY,
    width: row.width,
    height: row.height,
    shape: row.shape as TableShape,
  };
}

function toSectionDto(row: SectionRow): FloorSection {
  return { id: row.id, branchId: row.branchId, name: row.name };
}

/** The full floor plan for a branch: its sections and placed tables. */
export async function getFloorPlan(
  companyId: string,
  branchId: string,
): Promise<FloorPlan> {
  return withCompany(companyId, async (tx) => {
    const sections = await tx
      .select()
      .from(tables.floorSections)
      .where(
        and(
          eq(tables.floorSections.companyId, companyId),
          eq(tables.floorSections.branchId, branchId),
        ),
      )
      .orderBy(tables.floorSections.name);
    const tableRows = await tx
      .select()
      .from(tables.tables)
      .where(
        and(
          eq(tables.tables.companyId, companyId),
          eq(tables.tables.branchId, branchId),
        ),
      )
      .orderBy(tables.tables.label);
    return {
      sections: sections.map(toSectionDto),
      tables: tableRows.map(toTableDto),
    };
  });
}

/**
 * Moves a table through its lifecycle and broadcasts the change to the branch
 * room so every floor-plan client updates the tile's colour in place. The
 * transition is validated (see {@link isValidTableTransition}); the realtime
 * delta is published only after the transaction commits (ADR-0006).
 */
export async function transitionTable(
  companyId: string,
  tableId: string,
  toStatus: TableStatus,
): Promise<FloorTable> {
  const row = await withCompany(companyId, async (tx) => {
    const [table] = await tx
      .select()
      .from(tables.tables)
      .where(
        and(eq(tables.tables.companyId, companyId), eq(tables.tables.id, tableId)),
      )
      .limit(1);
    if (!table) throw notFound("Table not found");

    const from = table.status as TableStatus;
    if (!isValidTableTransition(from, toStatus)) {
      throw badRequest(`Illegal table transition: ${from} → ${toStatus}`);
    }

    const [updated] = await tx
      .update(tables.tables)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(
        and(eq(tables.tables.companyId, companyId), eq(tables.tables.id, tableId)),
      )
      .returning();
    return updated!;
  });

  realtimeBus.publish({
    companyId,
    branchId: row.branchId,
    event: { type: "table.changed", tableId: row.id, status: toStatus },
  });

  return toTableDto(row);
}
