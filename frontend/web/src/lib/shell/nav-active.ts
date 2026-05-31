/**
 * Whether a nav target is the active route (UI/UX modernization, slice 04).
 * Exact match, or a nested child route (`/pos/:b/receipt` is "under" `/pos/:b`),
 * but never a sibling-prefix false positive (`/pos/b12` is not under `/pos/b1`).
 * The root href "/" matches only itself.
 */
export function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
