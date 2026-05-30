import { createHash } from "node:crypto";

/**
 * Deterministically derives a child UUID (RFC-4122 v5 style) from a base key
 * and a suffix. Used to give the multiple ledger rows produced by one POS event
 * (e.g. several stock movements per fire, several tenders per settle) stable,
 * distinct idempotency keys, so replaying an offline event batch can never
 * double-apply (ADR-0006).
 */
export function deriveUuid(base: string, suffix: string): string {
  const bytes = createHash("sha1").update(`${base}:${suffix}`).digest().subarray(0, 16);
  const b = Buffer.from(bytes);
  b[6] = (b[6]! & 0x0f) | 0x50; // version 5
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC-4122 variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
