/**
 * Derives a tenant slug from a company name (Auth overhaul PRD §2.2/§6). Output
 * always satisfies the onboard/createInput charset `^[a-z0-9-]+$` (or is empty
 * when nothing slug-able remains, so the form can prompt for a manual value).
 * The onboarding form auto-suggests this and lets the user override it.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD") // split accents so "Café" → "Cafe" + combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics → a single dash
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 48);
}
