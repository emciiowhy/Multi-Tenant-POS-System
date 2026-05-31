import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import type { RevocationStore } from "@vendme/auth";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { listAccountMemberships } from "../auth/auth.service.js";
import { createCompanyWithOwner, listRegisters } from "./company.service.js";

const createInput = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug: lowercase, digits, dashes"),
  industry: z.enum(["retail", "restaurant", "auto_service", "dealership"]).optional(),
});

export function companyRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  const auth = authenticate(revocations);

  // Create a company. The authenticated account becomes its owner.
  router.post(
    "/",
    auth,
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = createInput.parse(req.body);
      const company = await createCompanyWithOwner({
        ...body,
        ownerAccountId: req.ctx.accountId,
      });
      res.status(201).json(company);
    }),
  );

  // List the companies the authenticated account belongs to (company switcher).
  router.get(
    "/mine",
    auth,
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json(await listAccountMemberships(req.ctx.accountId));
    }),
  );

  // Registers in a branch — used by the POS to pick a till when opening a Shift.
  router.get(
    "/branches/:branchId/registers",
    auth,
    requirePermission("pos:shift:open"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const branchId = z.string().uuid().parse(req.params.branchId);
      res.json(await listRegisters(req.ctx.companyId, branchId));
    }),
  );

  // Echo the resolved tenant context — proves the auth+RLS scoping end-to-end.
  router.get(
    "/context",
    auth,
    requirePermission("inventory:product:read"),
    asyncHandler(async (req, res) => {
      res.json(req.ctx);
    }),
  );

  return router;
}
