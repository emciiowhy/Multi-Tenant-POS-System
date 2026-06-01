# Header: SessionProvider + tenant switcher + profile

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The tenant-switching header (PRD spec 2). The active Company is the tenancy
boundary (ADR-0001); switching re-mints the access token (ADR-0004).

- Add `SessionProvider` to `app/providers.tsx` (currently absent) so client
  components can read/update the session.
- `TenantSwitcher` — a header dropdown listing `session.memberships`, marking the
  active one; selecting one calls `useSession().update({ activeCompanyId })`
  (via the existing `switch-company` action) to re-mint the token.
- Profile menu (active Company name + account + sign out).

## Acceptance criteria

- [x] `SessionProvider` wraps the client tree; `useSession` works in the shell.
- [x] `TenantSwitcher` lists memberships, marks the active company, and invokes the switch on select (jsdom test mocking `useSession`/the action).
- [x] The header shows the active Company + profile; sign-out works.
- [x] Switching company causes a token re-mint (subsequent API calls carry the new `company` claim).

## Blocked by

- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`

## Done (red-green)

Implemented as a **session bridge** so the header components never import
`next-auth/react` directly (one seam, trivially testable):

- **`lib/auth/session-view.ts`** (pure, node-tested) — `initialsFor` +
  `buildSessionView(rawSession, { enabledModules })` → a total view-model
  (`status`, `account{ id,name,email,imageUrl,initials }`, `activeCompany`,
  `companies[]`, `enabledModules`). Active company = the membership matching
  `activeCompanyId`; name falls back email→"Account".
- **`components/auth/SessionProvider.tsx`** — wraps NextAuth's `SessionProvider`
  and re-exposes `useAppSession()`: the view-model plus `switchCompany(id)`
  (`useSession().update({ activeCompanyId })` → `router.refresh()` so the server
  `(dashboard)` layout re-resolves role/permissions) and `signOut()`. Returns a
  safe loading default outside a provider (keeps unrelated shell tests green).
- **`components/auth/TenantSwitcher.tsx`** — listbox of memberships, active one
  flagged (`aria-selected`/✓), select → `switchCompany`; loading→skeleton,
  no-memberships→null.
- **`components/auth/ProfileMenu.tsx`** — avatar (image else initials), menu with
  account + active company + Sign out; loading→skeleton.
- Wired `SessionProvider` into `app/providers.tsx` (outermost) and mounted
  `<TenantSwitcher/> <ProfileMenu/>` into the AppShell `header-actions` slot.

Token re-mint: `switchCompany` calls `update({ activeCompanyId })`, which the
NextAuth `jwt` callback validates against memberships; the next
`/api/access-token` GET re-scopes the token to the new `company` claim
(unchanged backend path). Verified at the wiring level by the SessionProvider
test (asserts `update({ activeCompanyId })` + `router.refresh()`); the live
re-mint is exercised by the existing access-token route. Visual gate: `next dev`.

Tests: `session-view` (11) + `SessionProvider` (4) + `TenantSwitcher` (6) +
`ProfileMenu` (5) = **26 new**. Frontend suite **179 passing**; workspace
typecheck **8/8**.

### Gaps carried forward (need a backend change → out of this sprint's scope)

- **`enabledModules` sourcing.** The bridge *broadcasts* `enabledModules` (a prop,
  default `{}`, tested), but the real per-company flags aren't reachable on the
  client: `listAccountMemberships` returns only `{companyId, companyName,
  companySlug, roleKey}`. Threading real flags needs the backend auth service +
  NextAuth `Membership` type to carry `enabledModules`, which the sprint's
  "no backend changes" rule forbids. So the shell still resolves
  `enabledModules: {}` and **restaurant nav (Floor/Kitchen) stays hidden in-app**
  (components + tests already support it). Wire it when memberships carry modules.
- **Branch picker** for when the user isn't on a branch route — still deferred.
