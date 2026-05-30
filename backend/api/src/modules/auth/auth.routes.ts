import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  listAccountMemberships,
  registerAccount,
  resolveMembership,
  verifyCredentials,
} from "./auth.service.js";

const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).optional(),
});

const verifyInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Auth routes. The credential-verification + membership endpoints are consumed
 * by the NextAuth credentials provider, which is the token-minting authority
 * (ADR-0004). The API itself never mints.
 */
export const authRouter: Router = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerInput.parse(req.body);
    const account = await registerAccount(body);
    res.status(201).json(account);
  }),
);

// Internal: called by the Next.js auth layer to validate credentials.
authRouter.post(
  "/verify-credentials",
  asyncHandler(async (req, res) => {
    const body = verifyInput.parse(req.body);
    const account = await verifyCredentials(body);
    if (!account) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    const memberships = await listAccountMemberships(account.id);
    res.json({ account, memberships });
  }),
);

// Internal: confirm an account's role in a company before (re)minting a token.
authRouter.get(
  "/memberships/:accountId/:companyId",
  asyncHandler(async (req, res) => {
    const membership = await resolveMembership(
      req.params.accountId!,
      req.params.companyId!,
    );
    if (!membership) {
      res.status(404).json({ error: "not_a_member" });
      return;
    }
    res.json(membership);
  }),
);
