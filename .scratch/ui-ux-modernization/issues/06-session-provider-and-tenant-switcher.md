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

- [ ] `SessionProvider` wraps the client tree; `useSession` works in the shell.
- [ ] `TenantSwitcher` lists memberships, marks the active company, and invokes the switch on select (jsdom test mocking `useSession`/the action).
- [ ] The header shows the active Company + profile; sign-out works.
- [ ] Switching company causes a token re-mint (subsequent API calls carry the new `company` claim).

## Blocked by

- `.scratch/ui-ux-modernization/issues/05-dashboard-shell.md`
