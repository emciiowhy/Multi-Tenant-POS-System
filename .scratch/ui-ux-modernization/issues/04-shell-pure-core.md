# Shell pure-core: nav model, active state, offline indicator logic

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The pure decision functions the shell components consume — built and tested
before any layout, so what shows / what's highlighted / what the indicator says
are provably correct.

- `navItemsFor({ role, enabledModules })` → ordered `{ key, label, icon, href }[]`:
  restaurant items appear only when the `restaurant` module is enabled (mirrors
  the backend module seam, ADR-0005); role-gated items hide for roles lacking them.
- `isActiveNav(pathname, href)` → prefix-aware active match (e.g. `/pos/:branch`
  highlights "POS"; no false positives across siblings).
- `offlineIndicatorState({ online, pendingCount })` → `{ kind: "online" | "queued"
  | "offline"; count }`.

## Acceptance criteria

- [ ] `navItemsFor` unit-tested: restaurant gating, role gating, stable order — RED first.
- [ ] `isActiveNav` unit-tested: exact + nested-prefix matches, no sibling false positives.
- [ ] `offlineIndicatorState` unit-tested across online/queued/offline + count.
- [ ] All three are pure (no React/DOM) and live under `lib/shell/`.

## Blocked by

None - can start immediately (pure; the shell in slice 05 consumes it).
