import { Router } from "express";
import { z } from "zod";
import type { RevocationStore } from "@vendme/auth";
import { asyncHandler } from "../../lib/async-handler.js";
import { badRequest, unauthorized } from "../../lib/context.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requirePermission } from "../../middleware/require-permission.js";
import {
  applyWebhook,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
} from "./billing.service.js";

const checkoutInput = z.object({ planKey: z.string().min(1).default("standard") });

/**
 * Billing routes (ADR-0005). Mounted at /v1/billing and deliberately NOT behind
 * the subscription gate — a lapsed Company must still be able to read its status
 * and pay its way back in. Read is open to any member; checkout/portal need
 * `billing:subscription:manage`; the webhook is unauthenticated and instead
 * Stripe-signature-verified (it receives the RAW body — see server.ts).
 */
export function billingRouter(revocations: RevocationStore): Router {
  const router: Router = Router();
  const auth = authenticate(revocations);

  // Any member may read status (a cashier needs to see the lockout reason).
  router.get(
    "/subscription",
    auth,
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json({ subscription: await getSubscription(req.ctx.companyId) });
    }),
  );

  router.post(
    "/checkout",
    auth,
    requirePermission("billing:subscription:manage"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      const { planKey } = checkoutInput.parse(req.body ?? {});
      res.json(await createCheckoutSession(req.ctx.companyId, planKey));
    }),
  );

  router.post(
    "/portal",
    auth,
    requirePermission("billing:subscription:manage"),
    asyncHandler(async (req, res) => {
      if (!req.ctx) throw unauthorized();
      res.json(await createPortalSession(req.ctx.companyId));
    }),
  );

  // Stripe → us. No auth; the Stripe signature is the credential. The raw body is
  // provided by express.raw mounted for this path ahead of the JSON parser.
  router.post(
    "/webhook",
    asyncHandler(async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (typeof signature !== "string") throw badRequest("Missing stripe-signature header");
      const result = await applyWebhook(req.body as Buffer, signature);
      res.json({ received: true, ...result });
    }),
  );

  return router;
}
