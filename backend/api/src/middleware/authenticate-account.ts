import type { RequestHandler } from "express";
import type { RevocationStore } from "@vendme/auth";
import { verifyAccessToken } from "../lib/jwks.js";
import { unauthorized } from "../lib/context.js";
import { asyncHandler } from "../lib/async-handler.js";

/**
 * Account-scoped guard for account-level routes (PRD §2.3). Verifies the access
 * token + revocation exactly like {@link authenticate}, but does NOT require a
 * `company` claim — so a brand-new, tenant-less account can create its first
 * company. Accepts both onboarding tokens (no company) and ordinary
 * company-scoped tokens (an existing member adding another workspace). Mounted
 * ONLY where account identity alone is sufficient — i.e. `POST /v1/companies`,
 * whose handler authorizes by `req.ctx.accountId` only.
 */
export function authenticateAccount(revocations: RevocationStore): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized("Missing bearer token");
    const token = header.slice("Bearer ".length);

    let claims;
    try {
      claims = await verifyAccessToken(token);
    } catch {
      throw unauthorized("Invalid or expired token");
    }

    if (await revocations.isRevoked(claims.sid)) {
      throw unauthorized("Session revoked");
    }

    req.ctx = {
      accountId: claims.sub,
      // "" for an onboarding token; the company-creation handler does not read it
      // (the new company's id scopes its own RLS inserts).
      companyId: claims.company ?? "",
      role: claims.role,
      sid: claims.sid,
    };
    next();
  });
}
