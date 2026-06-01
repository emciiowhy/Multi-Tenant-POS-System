import type { RequestHandler } from "express";
import type { RevocationStore } from "@vendme/auth";
import { verifyAccessToken } from "../lib/jwks.js";
import { forbidden, unauthorized } from "../lib/context.js";
import { asyncHandler } from "../lib/async-handler.js";

/**
 * Verifies the Bearer access token, checks the sid against the revocation set
 * (ADR-0004), and attaches the company-scoped {@link RequestContext}. Every
 * authenticated request resolves to exactly one `company` claim, which then
 * drives `withCompany()`.
 */
export function authenticate(revocations: RevocationStore): RequestHandler {
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

    // The token is valid (authenticated) but carries no tenant scope: an
    // account-scoped onboarding token (no `company` claim, PRD §2.3). Company
    // creation accepts it via `authenticateAccount`; every other company-scoped
    // route forbids it — 403 (authenticated, but not authorized for this
    // resource), not 401.
    if (!claims.company) {
      throw forbidden("Token has no active company");
    }

    req.ctx = {
      accountId: claims.sub,
      companyId: claims.company,
      role: claims.role,
      sid: claims.sid,
    };
    next();
  });
}
