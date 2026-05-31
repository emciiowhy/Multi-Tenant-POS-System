import { z } from "zod";
import { uuid, isoDate } from "./common.js";

/**
 * Restaurant vertical (ADR-0005). Wire shapes for the Kitchen Display System.
 * The Restaurant module is gated per-company by `companies.enabledModules`.
 */

/** Kitchen Display System ticket lifecycle. Advances forward only. */
export const kdsStatus = z.enum(["queued", "preparing", "ready", "served"]);
export type KdsStatus = z.infer<typeof kdsStatus>;

/** A KDS ticket as shown on the kitchen screen. */
export const kitchenTicket = z.object({
  id: uuid,
  orderId: uuid,
  branchId: uuid,
  status: kdsStatus,
  firedAt: isoDate,
  readyAt: isoDate.nullable(),
});
export type KitchenTicket = z.infer<typeof kitchenTicket>;

/** Advance a ticket to a later station state (queued→preparing→ready→served). */
export const kdsTransitionInput = z.object({ status: kdsStatus });
export type KdsTransitionInput = z.infer<typeof kdsTransitionInput>;

/** Floor/table state for the interactive floor plan. */
export const tableStatus = z.enum(["free", "seated", "ordered", "bill"]);
export type TableStatus = z.infer<typeof tableStatus>;

export const tableShape = z.enum(["rect", "circle"]);
export type TableShape = z.infer<typeof tableShape>;

/** A section of the floor (e.g. Patio, Main). */
export const floorSection = z.object({
  id: uuid,
  branchId: uuid,
  name: z.string(),
});
export type FloorSection = z.infer<typeof floorSection>;

/** A table as placed on the floor-plan canvas; `status` drives its fill. */
export const floorTable = z.object({
  id: uuid,
  branchId: uuid,
  sectionId: uuid.nullable(),
  label: z.string(),
  seats: z.number().int(),
  status: tableStatus,
  posX: z.number().int(),
  posY: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  shape: tableShape,
});
export type FloorTable = z.infer<typeof floorTable>;

/** The full floor plan for a branch: its sections and placed tables. */
export const floorPlan = z.object({
  sections: z.array(floorSection),
  tables: z.array(floorTable),
});
export type FloorPlan = z.infer<typeof floorPlan>;

/** Move a table through its lifecycle (free→seated→ordered→bill→free). */
export const tableTransitionInput = z.object({ status: tableStatus });
export type TableTransitionInput = z.infer<typeof tableTransitionInput>;
