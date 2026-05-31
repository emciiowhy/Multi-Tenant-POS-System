import { Router } from "express";
import { recordMovementInput } from "@vendme/contracts";
import type { RevocationStore } from "@vendme/auth";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireActiveSubscription } from "../../middleware/require-active-subscription.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { getOnHand, recordMovement } from "./inventory.service.js";

export function inventoryRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  // authenticate + active-subscription gate (ADR-0005) on every inventory route.
  const auth = [authenticate(revocations), requireActiveSubscription()];

  router.get(
    "/on-hand",
    auth,
    requirePermission("inventory:product:read"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json(await getOnHand(req.ctx.companyId));
    }),
  );

  router.post(
    "/movements",
    auth,
    requirePermission("inventory:stock:adjust"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = recordMovementInput.parse(req.body);
      const result = await recordMovement(req.ctx.companyId, body);
      res.status(result.status === "applied" ? 201 : 200).json(result);
    }),
  );

  return router;
}
