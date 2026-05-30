import { z } from "zod";
import { uuid } from "./common.js";

/** Claims carried by the access JWT (ADR-0004). */
export const accessTokenClaims = z.object({
  sub: uuid, // accountId
  company: uuid, // activeCompanyId
  role: z.string(), // role key in the active company
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
