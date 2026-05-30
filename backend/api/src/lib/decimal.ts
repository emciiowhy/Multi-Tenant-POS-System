/**
 * Fixed-point decimal arithmetic at 4 dp, backed by BigInt. Quantities and
 * money are stored/transported as decimal strings; summing them as JS numbers
 * would drift (0.1 + 0.2 ≠ 0.3). All ledger math goes through here.
 */
export const SCALE = 4;
const FACTOR = 10n ** BigInt(SCALE);

export function toScaled(value: string, scale = SCALE): bigint {
  const neg = value.trim().startsWith("-");
  const v = neg ? value.trim().slice(1) : value.trim();
  const [intPart = "0", fracPart = ""] = v.split(".");
  const frac = (fracPart + "0".repeat(scale)).slice(0, scale);
  const scaled = BigInt(intPart || "0") * 10n ** BigInt(scale) + BigInt(frac || "0");
  return neg ? -scaled : scaled;
}

export function fromScaled(scaled: bigint, scale = SCALE): string {
  const neg = scaled < 0n;
  const abs = neg ? -scaled : scaled;
  const f = 10n ** BigInt(scale);
  const intPart = (abs / f).toString();
  const fracPart = (abs % f).toString().padStart(scale, "0");
  return `${neg ? "-" : ""}${intPart}.${fracPart}`;
}

export function sumScaled(values: string[]): string {
  let acc = 0n;
  for (const v of values) acc += toScaled(v);
  return fromScaled(acc);
}

export function subScaled(a: string, b: string): string {
  return fromScaled(toScaled(a) - toScaled(b));
}

/** Compares two fixed-point decimals: -1 | 0 | 1. */
export function cmpScaled(a: string, b: string): -1 | 0 | 1 {
  const d = toScaled(a) - toScaled(b);
  return d < 0n ? -1 : d > 0n ? 1 : 0;
}

/** Multiply two fixed-point decimals, rounding half-up back to SCALE dp. */
export function mulScaled(a: string, b: string): string {
  const product = toScaled(a) * toScaled(b); // now at 2*SCALE
  const half = FACTOR / 2n;
  const rounded = (product >= 0n ? product + half : product - half) / FACTOR;
  return fromScaled(rounded);
}

export function negate(value: string): string {
  return fromScaled(-toScaled(value));
}
