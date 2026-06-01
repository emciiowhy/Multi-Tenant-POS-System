/**
 * Auth-screen mode model (Auth overhaul PRD §2.1). The page manages three states;
 * the two publicly-linkable ones round-trip through `?mode=` (deep-link + back
 * button), while **onboarding is session-derived** — reached only when an
 * authenticated account has no tenant yet — so it is never a deep link and keeps
 * the URL clean.
 */
export type AuthMode = "signin" | "signup" | "onboarding";

export function authModeFromParam(param: string | null | undefined): AuthMode {
  return param === "signup" ? "signup" : "signin";
}

/** The `?mode=` value for a given mode, or null to drop the param (clean URL). */
export function authModeToParam(mode: AuthMode): string | null {
  return mode === "signup" ? "signup" : null;
}
