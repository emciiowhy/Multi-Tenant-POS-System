import { Router, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, tables } from "@vendme/db";
import type { RevocationStore } from "@vendme/auth";
import { authenticate } from "../middleware/authenticate.js";
import { requireActiveSubscription } from "../middleware/require-active-subscription.js";
import { asyncHandler } from "../lib/async-handler.js";
import { notFound, unauthorized } from "../lib/context.js";

/**
 * A pluggable product module (ADR-0005). v1 proves the seam with the Restaurant
 * vertical as its first (and only) consumer; the interface stays deliberately
 * small until a second module needs more. Each module mounts a router under
 * `/v1/{key}`; the seam — not the module — owns the cross-cutting concerns
 * (authentication and the per-company enablement gate), so a module body is
 * just its routes + per-route RBAC.
 */
export interface VendModule {
  /** Route prefix under /v1. */
  key: string;
  /**
   * If set, every request to this module 404s unless the company has the flag
   * turned on in `companies.enabledModules`. Conventionally equal to `key`.
   */
  requiresModule?: string;
  router(): Router;
}

/** Whether a company has a given module turned on (companies.enabledModules). */
export async function isModuleEnabled(
  companyId: string,
  moduleKey: string,
): Promise<boolean> {
  const [company] = await db
    .select({ enabledModules: tables.companies.enabledModules })
    .from(tables.companies)
    .where(eq(tables.companies.id, companyId))
    .limit(1);
  return Boolean(company?.enabledModules?.[moduleKey]);
}

/** Per-request gate: a disabled module is invisible (404), not merely forbidden. */
function moduleGate(moduleKey: string): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    if (!req.ctx) throw unauthorized();
    if (!(await isModuleEnabled(req.ctx.companyId, moduleKey))) {
      throw notFound("Module not enabled for this company");
    }
    next();
  });
}

/**
 * Mounts each module under `/v1/{key}`, fronted by authentication, the
 * active-subscription gate (ADR-0005), and (when the module declares
 * `requiresModule`) the enablement gate. Authentication runs first so the gates
 * can read the resolved company from `req.ctx`; the subscription gate runs
 * before the enablement gate so a lapsed Company gets 402 rather than a 404 that
 * leaks whether the module is on.
 */
export function mountModules(
  parent: Router,
  modules: VendModule[],
  revocations: RevocationStore,
): void {
  for (const mod of modules) {
    const guards: RequestHandler[] = [authenticate(revocations), requireActiveSubscription()];
    if (mod.requiresModule) guards.push(moduleGate(mod.requiresModule));
    parent.use(`/${mod.key}`, ...guards, mod.router());
  }
}
