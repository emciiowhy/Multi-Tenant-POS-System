import { z } from "zod";

/** Fail fast on missing/invalid configuration at boot. */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  REDIS_URL: z.string().optional(),
  /** Where the API fetches public keys to verify access tokens (ADR-0004). */
  JWKS_URL: z.string().url().optional(),
  /** Fallback: a single SPKI public key (PEM) when JWKS_URL is not used. */
  JWT_PUBLIC_KEY: z.string().optional(),
  /** Allowed browser origin(s) for CORS (the frontend). */
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  // Billing / Stripe (ADR-0005). All optional: the gate + trial work without
  // Stripe; the Stripe routes only function once these are set. Live billing is
  // a documented config prerequisite, not a build-time one.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Stripe price id for the default "standard" plan. */
  STRIPE_PRICE_STANDARD: z.string().optional(),
  BILLING_SUCCESS_URL: z.string().url().optional(),
  BILLING_CANCEL_URL: z.string().url().optional(),
  BILLING_PORTAL_RETURN_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
