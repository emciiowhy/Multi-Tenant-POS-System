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
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);
