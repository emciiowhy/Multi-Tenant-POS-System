/**
 * Extracts the active branch id from a branch-scoped route (UI/UX modernization,
 * slice 05). Branch-scoped flows live at `/{flow}/{branchId}`; the dashboard
 * shell reads the branch from the URL (the layout above these segments can't see
 * the nested param) to build sibling nav links for the same branch. Returns null
 * off a branch route or when the branch segment is missing.
 */
const BRANCH_PREFIXES = [
  "/pos/",
  "/shifts/",
  "/returns/",
  "/catalog/",
  "/inventory/",
  "/restaurant/floor/",
  "/restaurant/kds/",
];

export function branchIdFromPath(pathname: string): string | null {
  for (const prefix of BRANCH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      const seg = pathname.slice(prefix.length).split("/")[0];
      return seg || null;
    }
  }
  return null;
}
