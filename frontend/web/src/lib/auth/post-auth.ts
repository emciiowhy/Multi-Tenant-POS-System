/**
 * Post-authentication routing decision (Auth overhaul PRD §1.1/§1.3). A freshly
 * registered account — or any account that never finished setup — has no
 * memberships, so it can't mint a company-scoped token (the `/api/access-token`
 * 409). Rather than drop such a session on a broken dashboard, the auth screen
 * sends it to the Onboarding state to create its first tenant.
 */
export function needsOnboarding(memberships: readonly unknown[] | null | undefined): boolean {
  return !memberships || memberships.length === 0;
}
