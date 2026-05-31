import { Router } from "express";
import {
  createProductInput,
  createStockItemInput,
  createVariantInput,
  defineRecipeInput,
} from "@vendme/contracts";
import type { RevocationStore } from "@vendme/auth";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/context.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireActiveSubscription } from "../../middleware/require-active-subscription.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  createProduct,
  createStockItem,
  createVariant,
  defineRecipe,
  listProducts,
} from "./catalog.service.js";

export function catalogRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  // authenticate + active-subscription gate (ADR-0005) on every catalog route.
  const auth = [authenticate(revocations), requireActiveSubscription()];

  router.get(
    "/products",
    auth,
    requirePermission("inventory:product:read"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json(await listProducts(req.ctx.companyId));
    }),
  );

  router.post(
    "/products",
    auth,
    requirePermission("inventory:product:write"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = createProductInput.parse(req.body);
      res.status(201).json(await createProduct(req.ctx.companyId, body));
    }),
  );

  router.post(
    "/variants",
    auth,
    requirePermission("inventory:product:write"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = createVariantInput.parse(req.body);
      res.status(201).json(await createVariant(req.ctx.companyId, body));
    }),
  );

  router.post(
    "/stock-items",
    auth,
    requirePermission("inventory:product:write"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = createStockItemInput.parse(req.body);
      res.status(201).json(await createStockItem(req.ctx.companyId, body));
    }),
  );

  router.post(
    "/recipes",
    auth,
    requirePermission("inventory:recipe:write"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const body = defineRecipeInput.parse(req.body);
      res.status(201).json(await defineRecipe(req.ctx.companyId, body));
    }),
  );

  return router;
}
