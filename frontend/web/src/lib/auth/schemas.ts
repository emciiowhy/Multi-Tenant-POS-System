import { z } from "zod";

/**
 * Auth form payload schemas (Auth overhaul PRD §2.2). Kept pure + co-located so
 * they unit-test in isolation and stay in lockstep with the backend route
 * contracts they mirror:
 *   - signIn  ↔ `auth.routes.ts` verifyInput
 *   - signUp  ↔ `auth.routes.ts` registerInput (+ a client-only confirmPassword)
 *   - onboard ↔ `companies/company.routes.ts` createInput
 */

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
    displayName: z.string().min(1).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

/** The four verticals the backend `createInput` enum accepts. */
export const INDUSTRIES = ["retail", "restaurant", "auto_service", "dealership"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const onboardSchema = z.object({
  name: z.string().min(1),
  // Identical to the backend createInput slug rule (lowercase / digits / dashes).
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  industry: z.enum(INDUSTRIES).optional(),
});
export type OnboardInput = z.infer<typeof onboardSchema>;

/** Shape sent to `POST /v1/auth/register` — drops the client-only confirmPassword. */
export function toRegisterPayload(
  input: SignUpInput,
): { email: string; password: string; displayName?: string } {
  return { email: input.email, password: input.password, displayName: input.displayName };
}
