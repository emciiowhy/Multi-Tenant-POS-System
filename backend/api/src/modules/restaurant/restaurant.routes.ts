import { Router } from "express";
import { kdsTransitionInput, tableTransitionInput, uuid } from "@vendme/contracts";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import { requirePermission } from "../../middleware/require-permission.js";
import type { VendModule } from "../module.js";
import { listTickets, transitionTicket } from "./kds.service.js";
import { getFloorPlan, transitionTable } from "./table.service.js";

/**
 * Restaurant vertical routes (ADR-0005). Mounted at /v1/restaurant by the
 * module seam, which already applies authentication + the per-company
 * `restaurant` enablement gate — so these handlers only add per-route RBAC.
 */
function restaurantRouter(): Router {
  const router: Router = Router();

  // KDS board for a branch (kitchen staff).
  router.get(
    "/kds/:branchId/tickets",
    requirePermission("restaurant:kds:operate"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const branchId = uuid.parse(req.params.branchId);
      res.json(await listTickets(req.ctx.companyId, branchId));
    }),
  );

  // Advance a ticket through the lifecycle (queued→preparing→ready→served).
  router.post(
    "/kds/tickets/:ticketId/transition",
    requirePermission("restaurant:kds:operate"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const ticketId = uuid.parse(req.params.ticketId);
      const { status } = kdsTransitionInput.parse(req.body);
      res.json(await transitionTicket(req.ctx.companyId, ticketId, status));
    }),
  );

  // Interactive floor plan for a branch (sections + placed tables).
  router.get(
    "/floor/:branchId",
    requirePermission("restaurant:table:manage"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const branchId = uuid.parse(req.params.branchId);
      res.json(await getFloorPlan(req.ctx.companyId, branchId));
    }),
  );

  // Move a table through its lifecycle (free→seated→ordered→bill→free).
  router.post(
    "/tables/:tableId/transition",
    requirePermission("restaurant:table:manage"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const tableId = uuid.parse(req.params.tableId);
      const { status } = tableTransitionInput.parse(req.body);
      res.json(await transitionTable(req.ctx.companyId, tableId, status));
    }),
  );

  return router;
}

export const restaurantModule: VendModule = {
  key: "restaurant",
  requiresModule: "restaurant",
  router: restaurantRouter,
};
