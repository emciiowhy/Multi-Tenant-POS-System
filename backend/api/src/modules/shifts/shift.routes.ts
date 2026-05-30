import { Router } from "express";
import { z } from "zod";
import { money, uuid } from "@vendme/contracts";
import type { RevocationStore } from "@vendme/auth";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { addCashMovement, closeShift, openShift } from "./shift.service.js";

const openInput = z.object({
  branchId: uuid,
  registerId: uuid,
  openingFloat: money.default("0"),
});
const closeInput = z.object({ counted: money });
const cashMovementInput = z.object({
  amount: money,
  reason: z.string().min(1),
});

export function shiftRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  const auth = authenticate(revocations);

  router.post(
    "/",
    auth,
    requirePermission("pos:shift:open"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = openInput.parse(req.body);
      const shift = await openShift(req.ctx.companyId, {
        ...body,
        accountId: req.ctx.accountId,
      });
      res.status(201).json(shift);
    }),
  );

  router.post(
    "/:shiftId/cash-movements",
    auth,
    requirePermission("pos:drawer:manage"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = cashMovementInput.parse(req.body);
      res.status(201).json(
        await addCashMovement(req.ctx.companyId, req.params.shiftId!, body),
      );
    }),
  );

  router.post(
    "/:shiftId/close",
    auth,
    requirePermission("pos:shift:close"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = closeInput.parse(req.body);
      res.json(await closeShift(req.ctx.companyId, req.params.shiftId!, body.counted));
    }),
  );

  return router;
}
