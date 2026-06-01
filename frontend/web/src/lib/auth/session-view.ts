/**
 * Pure session view-model (UI/UX modernization, slice 06). Adapts the raw
 * NextAuth session into a clean, presentation-ready shape the header components
 * (TenantSwitcher, ProfileMenu) consume. Kept dependency-free + total (never
 * throws) so it unit-tests on node like the other slice pure-cores; the
 * structural `Raw*` inputs mean this never imports next-auth.
 *
 * The active Company is the tenancy boundary (ADR-0001); `companies` mirrors the
 * session's memberships with the active one flagged. `enabledModules` is carried
 * through here (injected by the provider) so the same view-model can later drive
 * module-gated nav — see the slice-06 note in SESSION_MEMORY on sourcing it.
 */

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface RawMembership {
  companyId: string;
  companyName: string;
  companySlug: string;
  roleKey: string;
}

export interface RawSession {
  accountId?: string | null;
  activeCompanyId?: string | null;
  memberships?: RawMembership[] | null;
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export interface SessionAccount {
  id: string;
  /** Display name (falls back to the email, then "Account"). */
  name: string;
  email: string | null;
  imageUrl: string | null;
  /** 1–2 char avatar fallback. */
  initials: string;
}

export interface SessionCompany {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
}

export interface SessionView {
  status: SessionStatus;
  account: SessionAccount | null;
  activeCompany: SessionCompany | null;
  companies: SessionCompany[];
  enabledModules: Record<string, boolean>;
}

/** Up to two uppercase initials for an avatar fallback; "?" when unknowable. */
export function initialsFor(nameOrEmail: string | null | undefined): string {
  const raw = (nameOrEmail ?? "").trim();
  if (!raw) return "?";
  // For an email, initials come from the local-part ("jane.doe@x" → "jane.doe").
  const base = raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
  const words = base.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

function emptyView(status: SessionStatus, enabledModules: Record<string, boolean>): SessionView {
  return { status, account: null, activeCompany: null, companies: [], enabledModules };
}

export function buildSessionView(
  input: { status: SessionStatus; session: RawSession | null | undefined },
  opts: { enabledModules?: Record<string, boolean> } = {},
): SessionView {
  const enabledModules = opts.enabledModules ?? {};

  if (input.status === "loading") return emptyView("loading", enabledModules);

  const session = input.session;
  if (!session || !session.accountId) return emptyView("unauthenticated", enabledModules);

  const companies: SessionCompany[] = (session.memberships ?? []).map((m) => ({
    id: m.companyId,
    name: m.companyName,
    slug: m.companySlug,
    role: m.roleKey,
    isActive: m.companyId === session.activeCompanyId,
  }));

  const displayName = session.user?.name?.trim() || session.user?.email || "Account";
  const account: SessionAccount = {
    id: session.accountId,
    name: displayName,
    email: session.user?.email ?? null,
    imageUrl: session.user?.image ?? null,
    initials: initialsFor(session.user?.name?.trim() || session.user?.email),
  };

  return {
    status: "authenticated",
    account,
    activeCompany: companies.find((c) => c.isActive) ?? null,
    companies,
    enabledModules,
  };
}
