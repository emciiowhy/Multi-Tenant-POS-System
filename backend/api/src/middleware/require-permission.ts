import type { RequestHandler } from "express";
import { can, type Permission } from "@vendme/auth";
import { forbidden, unauthorized } from "../lib/context.js";

/**
 * RBAC gate. Re-checked here at the edge; services re-check again for
 * defense-in-depth. Roles resolve their permissions with inheritance.
 */
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.ctx) return next(unauthorized());
    if (!can(req.ctx.role, permission)) return next(forbidden("Forbidden", permission));
    next();
  };
}
