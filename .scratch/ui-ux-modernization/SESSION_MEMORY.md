# SESSION MEMORY — UI/UX Modernization & Responsive Design Sprint

> **Absolute source of truth for resuming this sprint.** Read this first, then
> the PRD (`./PRD.md`) and the per-slice tickets (`./issues/0*.md`).
>
> **🎉 SPRINT COMPLETE: all 9 slices (01–09) DONE, GREEN, and COMMITTED.** The
> UI/UX Modernization & Responsive Design Sprint is finished. **Next work is the
> KDS / Order Lifecycle module** (see §4). This file reflects reality — verify with
> `git log --oneline` and the issue tick boxes (below).

_Last updated: 2026-06-01._

---

## 1. CURRENT SPRINT STATUS

**Sprint:** UI/UX Modernization & Responsive Design Sprint for **VendMe** — a
multi-tenant POS + ERP SaaS. Stack: **Next.js 16 (App Router) + React 19 +
Tailwind v4** frontend (`frontend/web`), **Express.js + TypeScript + Drizzle**
backend (`backend/api`), **Neon (Postgres)** database. pnpm + Turborepo monorepo.

**Scope:** presentational only — a design-token foundation, shared `ui/`
primitives, a real landing page, and a unified dashboard shell around the
existing flows (Auth, Company Switching, POS, Inventory, Floor Plans). **No
backend or business-logic changes.** Sliced into **9 tracer-bullet issues**.

**Verified state: ALL Slices 01–09 are IMPLEMENTED, VERIFIED, GREEN, and
COMMITTED — the sprint is 100% complete.** Frontend test suite: **200 passing**.
Full workspace typecheck: **clean (8/8 packages)**. Issues 01–09 all ticked.

| Slice | Title | Status | Commit |
|-------|-------|--------|--------|
| 01 | Design tokens + typography | ✅ DONE | `dd103b5` |
| 02 | Button + pure `buttonClasses` | ✅ DONE | `3e33866` |
| 03 | Input / Badge / Card / DataGridCard / Skeleton | ✅ DONE | `7657a7e` |
| 04 | Shell pure-core (`navItemsFor` / `isActiveNav` / `offlineIndicatorState`) | ✅ DONE | `27a4731` |
| 05 | Dashboard shell — `(dashboard)` route group + responsive sidebar | ✅ DONE | `205b0ac` |
| 06 | SessionProvider + TenantSwitcher + profile header | ✅ DONE | `76f8858` |
| 07 | Interceptors in shell (OfflineIndicator + billing-banner slot) | ✅ DONE | `3654a59` |
| 08 | Landing page | ✅ DONE | `66215ad` |
| 09 | Migrate existing flows onto primitives + shell | ✅ DONE | `f5a70a9` |

(PRD `952fbcf`; issue breakdown `ffbbbb6`.)

### What landed in each completed slice

- **Slice 01 — Tailwind v4 theme tokens + Inter font.** `globals.css` defines
  runtime semantic vars on `:root` (surface/surface-2, fg/fg-muted, border,
  brand + brand-strong/foreground, success/warning/danger + subtle bg),
  remapped from Tailwind's palette and **dark-switched via
  `prefers-color-scheme`**; `@theme inline` exposes them as utilities **by
  reference** (so `bg-surface`/`text-fg`/`bg-brand`/`border-border` flip with the
  theme without a `dark:` variant). Radius/shadow/motion tokens. `layout.tsx`
  wires **Inter** via `next/font` → `--font-inter` → `--font-sans`. **Brand is a
  single token (`--brand` → emerald)** — one edit re-themes.

- **Slice 02 — Pure button classes + accessible Button primitive.**
  `lib/ui/button-classes.ts`: pure `buttonClasses(variant, size, state)` +
  `isButtonInert(state)`. Variants `primary | secondary | outline | ghost |
  danger`; sizes `sm | md | lg`. Scale micro-interactions (hover scale-up /
  active compression) only when interactive and always **`motion-safe`-gated**;
  inert (`loading || disabled || blockedReason`) → `cursor-not-allowed` + dimmed.
  `components/ui/Button.tsx`: thin wrapper — `disabled`/`loading` use the native
  attribute; **`blockedReason` = soft lock** (focusable, `aria-disabled`,
  `title`, JS click-guard) — the contract slice 07 wires to the 402/offline
  states. `lib/ui/cn.ts` is a small class-merge.

- **Slice 03 — Pure badge resolver + core inputs & surfaces.**
  `lib/ui/badge-variant.ts`: pure, total, safe `badgeVariant(status)` →
  `neutral | success | warning | danger` (folds subscription/outbox/shift/KDS/
  table statuses; case-insensitive; unknown/empty/undefined → neutral, never
  throws). `components/ui/`: `Badge` (status auto-maps; explicit variant wins),
  `Input` (label via `useId`, `aria-invalid` + message on error, hint, disabled),
  `Card` (the standardized `rounded-card border-border bg-surface shadow-card`
  surface), `DataGridCard` (interactive tile — `aria-pressed`, hover:border-brand,
  motion-safe scale, selected ring), `Skeleton` (aria-hidden
  `motion-safe:animate-pulse`).

- **Slice 04 — Pure shell navigation logic + offline indicator state.** Three
  pure, dependency-free modules in `lib/shell/`: `navItemsFor(ctx, can)` (ordered
  items; restaurant items gated by `enabledModules.restaurant`; permission gating
  via an **injected `can` predicate**; branch-scoped items omitted without an
  active `branchId`; Billing ungated/always; order pos, shifts, returns, floor,
  kds, billing), `isActiveNav(pathname, href)` (exact/nested match, no
  sibling-prefix false positives, `"/"` exact-only), and
  `offlineIndicatorState({ online, pendingCount })` → `{ kind:
  online|queued|offline, count, tone }` (count clamped to a non-neg integer).

- **Slice 05 — Dashboard shell (`(dashboard)` route group + responsive
  sidebar).** `app/(dashboard)/layout.tsx` (server) resolves the active company's
  role + `resolvePermissions(role)` (auth stays server-side, never bundled to the
  client) → hands `AppShell` plain `{ role, permissions, enabledModules }`. Moved
  `pos`/`shifts`/`returns`/`restaurant`/`billing` under `(dashboard)` via
  `git mv` — **route groups don't change URLs** and pages use `@/` imports, so
  flows are unchanged; `/` (landing) + `/login` stay shell-free.
  `components/ui/Sidebar.tsx` (prop-driven: active via `isActiveNav` +
  `aria-current`, collapse icon-rail, toggle) + `components/ui/AppShell.tsx`
  (client: `usePathname` → `branchIdFromPath` for branch hrefs; `can` from the
  permission set; **one responsive `<aside>`** — static on desktop, transform
  off-canvas **drawer** on mobile with hamburger + backdrop + close-on-navigate;
  persisted `useSidebarStore` Zustand, SSR-safe). New pure helper
  `lib/shell/branch-path.ts` (`branchIdFromPath`).

- **Slice 06 — `SessionProvider` + `TenantSwitcher` + profile header.** A
  **session bridge** over NextAuth so the header components never import
  `next-auth/react` directly (one seam, trivially testable). Pure
  `lib/auth/session-view.ts` (`initialsFor` + `buildSessionView` → a total
  view-model: `status`, `account{id,name,email,imageUrl,initials}`,
  `activeCompany`, `companies[]`, `enabledModules`). `components/auth/`:
  `SessionProvider` (wraps NextAuth's `SessionProvider`, exposes `useAppSession()`
  = view-model + `switchCompany(id)` [`update({activeCompanyId})` → `router.refresh()`
  so the server `(dashboard)` layout re-resolves role/perms] + `signOut()`; safe
  loading default outside a provider so unrelated shell tests stay green),
  `TenantSwitcher` (listbox of memberships, active flagged, select → switch;
  loading→skeleton, none→null), `ProfileMenu` (avatar image-else-initials + menu
  with account/active company/sign out). Wired into `app/providers.tsx`
  (outermost) + mounted in the AppShell `header-actions` slot. Switch re-mints via
  the NextAuth `jwt` callback + the unchanged `/api/access-token` route. Tests 26
  (11+4+6+5).

- **Slice 07 — Interceptors in shell (OfflineIndicator + billing slot + action
  soft-lock).** One shell interceptor context, reusing existing pure logic +
  the outbox/replay seam. Pure `lib/shell/action-lock.ts` (`resolveActionLock({banner})`
  → soft-lock for gated actions when the sub is `trial_expired`/`past_due`/`blocked`;
  `none`/`trial_ending` stay live; **offline does NOT lock** — offline-first).
  `lib/shell/use-connectivity.ts` (`useOnline()`, thin `onlineManager` seam).
  `components/ui/Interceptors.tsx`: `InterceptorProvider` does the single
  subscription read (react-query) + connectivity + `useOutboxPending`, exposing
  `useInterceptors()`/`useActionLock()` (safe loading default outside a provider
  → AppShell stays QueryClient-free in tests); `OfflineIndicator` (subtle dot;
  queued→count + "syncing when online" + Retry via `retrySync`; offline state);
  `BillingBannerSlot` (reserved in-flow `<div>` reusing `BillingBanner` — pushes
  content down, never overlays; hidden on `/billing`). Wiring: `InterceptorProvider`
  wraps `AppShell` in the `(dashboard)` layout (above the QueryClient-free shell);
  AppShell mounts the indicator in the header + the banner slot above content;
  `BillingChrome` trimmed to the 402→`/billing` redirect only; POS page dropped
  its per-page pending pill (shared indicator now) and moved checkout onto
  `Button` w/ `blockedReason` from `useActionLock`. Tests 10 (2+8).

- **Slice 08 — Modern SaaS landing page.** Replaced the `/` auth-stub with a
  shell-free marketing surface on slice-01 tokens + slice-02/03 primitives. Pure
  `lib/marketing/landing-cta.ts` (`landingCta({status})` → "Get Started" `/login`
  for visitor/loading, "Go to dashboard" → `DASHBOARD_HOME` when authed;
  `DASHBOARD_HOME="/billing"` — no `/dashboard` index exists, /billing is the one
  always-valid non-branch route + renders inside the shell) + `pricing.ts`
  (`pricingTiers()`: trial/standard-featured/enterprise; `TRIAL_DAYS=14`,
  configurable `STANDARD_PRICE_DISPLAY`; paid CTAs → `/login`). `components/marketing/`:
  `LandingCtaButton` (session-aware via `useAppSession`, `buttonClasses` on a
  `Link`), `LandingHero`, `FeatureGrid` (POS/Shifts/Returns/real-time/multi-branch
  + upcoming Restaurant; reuses Card/Badge), `PricingMatrix`. `app/page.tsx`
  composes nav+hero+features+pricing+closing+footer. **Divergence (logged):**
  ticket said server component + `auth()`; per the live instruction the CTA uses
  the client `useAppSession` bridge (no `@/auth` import) so it's mockable. Token
  test asserts no hardcoded hex. Tests 11 (3+4+4).

- **Slice 09 — Migrate flows + components onto primitives/tokens; shell owns
  `<main>`.** Final, behavior-preserving refactor. `AppShell`'s content region is
  now the single `<main>`; every `(dashboard)` page dropped its own `<main>`/
  `min-h-screen`/page-bg and flows into it (`/login` + `/` stay shell-free with
  their own `<main>`). Re-skinned the four tested components (`AttentionBanner`,
  `SaleReceipt` [Badge+Button], `CloseShiftResult` [Button], `BillingBanner`) onto
  tokens — tests stayed green. Flow pages onto primitives: POS (`DataGridCard`,
  `Button`), Shifts (`Card`/`Input`/`Button`), Returns (`Card`/`Badge`/`Input`/
  `Button`; removed its leftover pending pill), Billing (`Card`/`Button`/`Badge`/
  `Skeleton`), Login (`Card`/`Input`/`Button`). **Documented exceptions:** Floor
  keeps its 4-state table `STATUS_COLOR` domain legend (no blue/fuchsia token); KDS
  got a landmark-only reconcile (deliberate dark board, out of this issue's
  flow-page list — travels with the KDS module work). Tests still **200** (refactor,
  no new tests).

---

## 2. SPRINT COMPLETE — NO ACTIVE SLICE

All nine slices are done, green, and committed (see the table above + §4 for what
comes next). Nothing in this sprint remains open.

### Gaps deliberately carried forward (need a BACKEND change → were out of this
### "no-backend-changes" sprint's scope; pick up when convenient)
- **`enabledModules` sourcing** (slice 06). The session bridge *broadcasts*
  `enabledModules` (prop, default `{}`, tested) but the real per-company flags
  aren't reachable on the client — `listAccountMemberships` returns only
  `{companyId, companyName, companySlug, roleKey}`. So the shell still resolves
  `enabledModules: {}` and **restaurant nav (Floor/Kitchen) stays hidden in-app**
  (the components + tests already support it). To fix: have the backend auth
  service + the NextAuth `Membership` type carry `enabledModules`, then thread it
  through `SessionProvider` → `AppShell` nav context.
- **Branch picker** for when the user isn't on a branch route (so branch-scoped nav
  can resolve a default branch).
- **KDS full primitive migration** — intentionally deferred to the KDS module work.

---

## 3. REMAINING ROADMAP SEQUENCE

In order (each red-green; commit per slice; existing tests must stay green):

- **Slice 06 — SessionProvider / TenantSwitcher / profile header** ✅ DONE (`76f8858`).
- **Slice 07 — Interceptors in shell** ✅ DONE (`3654a59`). Header `OfflineIndicator`
  (driven by `offlineIndicatorState` from `useOnline` + outbox `pendingCount`;
  the per-page POS pill is gone) + `BillingBanner` (reuse `bannerState`) in a
  **reserved in-flow shell slot** + `Button` `blockedReason` via `useActionLock`
  for the subscription lockout (offline stays non-blocking, offline-first).
- **Slice 08 — Modern SaaS landing page** ✅ DONE (`66215ad`). Shell-free `/` on
  tokens + primitives; session-aware CTA (`landingCta`/`useAppSession`); pure
  pricing tiers; `DASHBOARD_HOME=/billing`. CTA driven by `useAppSession` (client),
  a logged divergence from the ticket's "server component + auth()".
- **Slice 09 — Migrate existing flows onto primitives + shell** ✅ DONE (`f5a70a9`).
  Shell now owns the single `<main>`; pages dropped their `<main>`/`min-h-screen`/
  bg. The four tested components + the pos/shifts/returns/billing/login pages run on
  `Button`/`Input`/`Card`/`Badge`/`DataGridCard`/`Skeleton` + tokens. Floor keeps
  its domain table-color legend; KDS got a landmark-only reconcile. Tests stay 200.

---

## 4. STRATEGIC CONTEXT LOOKUP — what happens AFTER this sprint

**Immediately upon completing the full 9-slice UI/UX sprint, the system returns
directly to building the Kitchen Display System (KDS) and Order Lifecycle module
for the Restaurant vertical.** That is the resumption target — this UI/UX sprint
was a deliberate, time-boxed detour to standardize the design system and shell
before continuing KDS. The Restaurant module seam, floor plan, and existing KDS
ticket lifecycle already exist (ADR-0005); the next KDS work continues the order
lifecycle from there.

---

## Working conventions (so a fresh agent matches the existing rhythm)

- **Strict red-green TDD.** Pure logic → `*-logic.ts` / `*.ts` + `.test.ts`
  (node); components → `.test.tsx` with `// @vitest-environment jsdom`. Write the
  failing test, run RED, implement, run GREEN. `vitest.config.ts` already sets
  automatic JSX + the `@/` alias. Mock `next/link` and `next/navigation` in
  component tests.
- **Commit per slice** on `main` (solo trunk) with a descriptive message; end
  messages with the `Co-Authored-By: Claude Opus 4.8` trailer. Tick the issue
  acceptance boxes + add a Comment when a slice lands.
- **Design system:** never hardcode hex — read tokens (`bg-surface`, `text-fg`,
  `bg-brand`, `border-border`, status `*-bg`/text, `rounded-card`, `shadow-card`).
  Brand = emerald, base = slate/neutral, font = Inter (all single-edit swappable).
- **Reuse, don't reinvent:** `bannerState` (billing), outbox `pendingCount` /
  `flushNow` / `onlineManager`, `switch-company` action, `decideAccess`. The shell
  consumes them.
- **Key locations:** primitives `frontend/web/src/components/ui/`; pure UI/shell
  logic `frontend/web/src/lib/ui/` + `frontend/web/src/lib/shell/`; shell layout
  `frontend/web/src/app/(dashboard)/layout.tsx`; tokens
  `frontend/web/src/app/globals.css`.
- **Verify a resume with:** `cd frontend/web && npx vitest run` (expect 200+
  passing) and `pnpm -w turbo run typecheck` (expect 8/8). If typecheck trips on
  `.next/types/validator.ts` referencing old paths, delete the stale `.next/`
  cache (gitignored) and re-run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
