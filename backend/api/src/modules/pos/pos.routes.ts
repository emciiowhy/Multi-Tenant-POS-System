import { Router } from "express";
import { posEventBatch } from "@vendme/contracts";
import type { RevocationStore } from "@vendme/auth";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { processBatch } from "./pos.service.js";
import { getReceipt } from "./receipt.service.js";

export function posRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  const auth = authenticate(revocations);

  /**
   * Submit a batch of POS events (the offline outbox replays here). No blanket
   * permission: each event is RBAC-checked individually inside processBatch, so
   * a cashier without refund rights gets that one event rejected, not the batch.
   */
  router.post(
    "/events",
    auth,
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const { events } = posEventBatch.parse(req.body);
      const results = await processBatch(req.ctx.companyId, req.ctx.role, events);
      res.json({ results });
    }),
  );

  router.get(
    "/orders/:orderClientUuid/receipt",
    auth,
    requirePermission("pos:order:create"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json(await getReceipt(req.ctx.companyId, req.params.orderClientUuid!));
    }),
  );

  return router;
}
