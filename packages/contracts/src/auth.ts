import { z } from "zod";
import { uuid } from "./common.js";

/** Claims carried by the access JWT (ADR-0004). */
export const accessTokenClaims = z.object({
  sub: uuid, // accountId
  // Active company. OPTIONAL: an account-scoped "onboarding" token (a brand-new
  // account with no tenant yet) carries no company claim — accepted ONLY by the
  // account-scoped guard (`authenticateAccount`) on company creation; the normal
  // company-scoped `authenticate` rejects a token without it (PRD §2.3).
  company: uuid.optional(),
  role: z.string(), // role key in the active company ("" for onboarding tokens)
  sid: uuid, // session id, revocable
  iat: z.number(),
  exp: z.number(),
});
export type AccessTokenClaims = z.infer<typeof accessTokenClaims>;

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginInput>;

export const switchCompanyInput = z.object({ companyId: uuid });
export type SwitchCompanyInput = z.infer<typeof switchCompanyInput>;
