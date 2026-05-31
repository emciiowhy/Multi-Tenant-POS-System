/** Joins truthy class fragments. Tiny on purpose — primitives compose a known,
 *  non-conflicting set of token classes, so full tailwind-merge isn't needed. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
