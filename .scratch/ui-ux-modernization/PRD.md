# PRD — UI/UX Modernization (design system, landing page, dashboard shell)

Status: ready-for-agent
Area: frontend/web (design tokens, app shell, landing, shared primitives), respects ADR-0008 / ADR-0012 / ADR-0013 / ADR-0014
Provider: n/a (pure frontend)

> **Strategic roadmap note.** This is a targeted, self-contained sprint to standardize the design system, ship a real landing page, and build a unified dashboard shell around the *existing* flows (Auth, Company Switching, POS, Inventory, Floor Plans). It adds **no business logic** and changes **no backend**. The moment the blueprint and its implementation slices land, work returns directly to the **Kitchen Display System (KDS) / Order Lifecycle** module as planned.

## Problem Statement

VendMe's backend is a complete v1 SaaS spine, but the frontend looks like scaffolding. There is no landing page — `/` is a bare auth-check stub. There is no app shell: every flow page (`/pos/[branchId]`, `/shifts/[branchId]`, `/returns/[branchId]`, `/restaurant/floor/[branchId]`) renders its own ad-hoc `<main>` with no shared navigation, no header, and no way to switch tenants in the UI (the `switch-company` server action exists but nothing mounts it). Styling is untokenized inline Tailwind: the de-facto palette (`neutral-*`, `emerald-600`, `red-600`, `amber-*`), radii, and button shapes are copy-pasted across pages, with no shared `Button`/`Input`/`Badge`/`Card` primitives, no typography scale, and no custom font. Tailwind v4 is installed but `globals.css` declares **no `@theme` tokens at all**. The result: inconsistent spacing/colors, no interactive polish (hover/active/disabled/loading), and no responsive strategy for tablet/mobile. The billing 402 banner and offline pending-sync pill already exist but are bolted onto individual pages rather than living in a coherent shell.

## Solution

A design-system-first modernization in three layers, plus the cross-cutting interceptor states.

1. A **token + typography foundation** in Tailwind v4's `@theme` (semantic color, spacing, radius, shadow, motion tokens) and a real web font via `next/font`, so every component reads from tokens instead of hardcoded utilities.
2. A **premium, conversion-focused landing page** at `/` (hero, interactive feature grid for offline / real-time / multi-branch, a pricing matrix aligned to the Standard plan, and a "Get Started" CTA into the auth onboarding flow).
3. A **responsive dashboard shell** — a `(dashboard)` route group whose layout renders a fluid collapsible sidebar, a header with tenant switcher + profile + offline indicator, and container-query/flex-grid responsiveness — wrapping all existing authenticated flows unchanged in behavior.
4. A **unified component style guide** of shared primitives (`Button`, `Input`, `Badge`, `Card`, `Skeleton`, `DataGrid` card) with explicit `:hover` / `:active` / `:disabled` / loading states, and the two **flow interceptors** (subscription 402 block, offline-queued indicator) standardized into the shell so they degrade gracefully without breaking layout geometry.

Existing tested components (`AttentionBanner`, `SaleReceipt`, `CloseShiftResult`, `BillingBanner`, `BillingRedirect`, `BillingChrome`) are **refactored to consume the new primitives/tokens**, not rewritten in behavior. The billing redirect/banner (ADR-0012) and the offline outbox (ADR-0013) are surfaced through the shell, not reinvented.

## User Stories

1. As a prospective customer, I want a polished landing page that explains VendMe, so that I understand the product before signing up.
2. As a prospective customer, I want the landing hero to state the core promise (offline-resilient, multi-tenant POS) with a single prominent CTA, so that I know what to do next.
3. As a prospective customer, I want an interactive feature grid highlighting offline mode, real-time sync, and multi-branch management, so that I can evaluate the differentiators.
4. As a prospective customer, I want a clear pricing matrix showing the free trial and the Standard plan, so that I know what it costs before committing.
5. As a prospective customer, I want a "Get Started" button that takes me straight into sign-in / onboarding, so that there's no friction to trying it.
6. As a returning user, I want the landing page to recognize I'm signed in and offer "Go to dashboard," so that I'm not asked to sign in again.
7. As an operator, I want a persistent sidebar listing every area I can access (POS, Inventory, Floor, Shifts, Returns), so that I can move between flows without typing URLs.
8. As an operator, I want the sidebar to highlight my current location, so that I always know where I am.
9. As an operator, I want the sidebar to collapse to icons (and to a drawer on small screens), so that I reclaim screen space on a register or tablet.
10. As an operator on a tablet, I want navigation and controls to respond to touch with adequate hit targets, so that the app is usable without a mouse.
11. As a multi-company owner, I want a tenant switcher in the header, so that I can change the active Company without leaving the dashboard.
12. As a multi-company owner, I want the active Company and my profile shown in the header, so that I always know which tenant I'm acting in (ADR-0001).
13. As any user, I want buttons that visibly respond to hover, press, disabled, and loading states, so that the UI feels responsive and I trust my clicks registered.
14. As a cashier, I want an action that's mid-sync or blocked to be visibly disabled with a reason, so that I don't double-submit or get a silent failure.
15. As a cashier working offline, I want a subtle, persistent indicator that changes are queued locally, so that I know my sales are safe and will sync (ADR-0013).
16. As a cashier, I want the offline indicator to show how many changes are queued and let me retry now, so that I can force a drain when connectivity returns.
17. As an owner whose subscription lapsed, I want the trial/past-due banner to appear within the shell without shoving content off-screen or breaking layout, so that the app stays usable while I'm prompted to pay (ADR-0012).
18. As an owner who is fully blocked (402), I want to be routed to billing with a clear message rather than a broken page, so that I can recover (ADR-0012).
19. As a developer, I want a single source of design tokens (color, spacing, radius, typography, motion), so that components are consistent and theme changes are one edit.
20. As a developer, I want shared, tested primitives (`Button`, `Input`, `Badge`, `Card`, `Skeleton`), so that I stop re-implementing them per page.
21. As a developer, I want the dashboard shell to be a route-group layout, so that authenticated flows opt in by location and the landing/login stay shell-free.
22. As a developer, I want the navigation model and active-state logic to be pure functions, so that what shows (per role/enabled module) and what's highlighted are unit-tested.
23. As a developer, I want existing flow pages to keep working unchanged after they're dropped into the shell, so that this sprint is purely presentational.
24. As a user with reduced-motion preferences, I want the scale/press animations to respect `prefers-reduced-motion`, so that the UI is comfortable and accessible.
25. As a user, I want consistent dark-mode support across the shell, landing, and primitives, so that the whole app honors my system theme.

## Implementation Decisions

### A. Design token + typography foundation (prerequisite for everything else)

- **Tokens live in Tailwind v4 `@theme`** inside `globals.css` (this codebase has no `tailwind.config.*`; v4 is CSS-first). Define semantic tokens, not raw scales, so components reference intent:
  - color: `--color-brand` (+ `-fg`, `-muted`), `--color-surface` / `--color-surface-2`, `--color-border`, `--color-fg` / `--color-fg-muted`, and status `--color-success` / `--color-warning` / `--color-danger` (+ subtle background variants). Map the existing de-facto palette onto these so the visual jump is controlled, not jarring.
  - radius: `--radius-sm|md|lg|xl`; shadow: `--shadow-sm|md|lg` (subtle elevation); motion: `--ease-standard`, `--duration-fast|base`.
  - Each token has a light and dark value; dark mode stays driven by `color-scheme` + Tailwind `dark:`.
- **Brand direction (recommended default, easily changed):** keep **emerald** as the brand/primary accent — it is already the conversion-positive "Charge" color — paired with a **slate/neutral** base. This is a deliberate, low-risk default; a single `--color-brand` edit re-themes everything. (Flagged as the one subjective call; swapping the brand hue must not require touching components.)
- **Typography:** introduce a variable web font via `next/font` (recommended **Inter** for UI; an optional display weight for the hero), exposed as `--font-sans`, wired in `app/layout.tsx`. Define a small type scale (display / h1–h3 / body / caption) as utility patterns or token-driven classes.
- **No new heavy dependencies.** Build primitives by hand on Tailwind v4 (no shadcn/Radix import in this sprint); a tiny class-merge helper (`cn`) is acceptable. Keep the bundle lean.

### B. Modern SaaS landing page (`/`)

- Replace the stub `app/page.tsx`. It stays a **server component** that calls `auth()`; if a session exists it renders a "Go to dashboard" CTA instead of "Get Started" (story 6). The marketing sections are presentational components under `components/marketing/`.
- Sections: **Hero** (headline = offline-resilient, multi-tenant POS; subcopy; primary CTA "Get Started" → `/login`; secondary "View pricing" anchor), **Feature grid** (interactive cards: Offline mode → ADR-0013 outbox; Real-time sync → ADR-0014 deltas; Multi-branch / multi-tenant → ADR-0001), **Pricing matrix**, and a closing CTA band. A lightweight top nav (logo + "Sign in" + "Get Started") and a footer.
- **Pricing matrix** presents three columns: **Free Trial** (14 days, from the `TRIAL_DAYS` constant), **Standard** (the real purchasable plan — the seeded `standard` plan; ADR-0012), and **Enterprise / Contact**. The Standard price is rendered from a single configurable display constant (placeholder until the real Stripe price is wired) and its CTA routes into sign-in → the in-app `/billing` Subscribe flow (it does NOT call Stripe from marketing). "Get Started"/CTAs link to `/login` (the auth onboarding entry).
- "Interactive" = tasteful hover/reveal/scale on feature and pricing cards using the motion tokens; no heavy animation libraries.

### C. Responsive dashboard shell (`(dashboard)` route group)

- Introduce an App Router **route group `(dashboard)`** with a `layout.tsx` that renders the shell; **move the existing authenticated routes** (`pos`, `shifts`, `returns`, `restaurant/*`, `billing`) under it. `/` (landing) and `/login` stay at the root, shell-free. Page *bodies* are unchanged — they render into the shell's content slot. KDS will later mount in the same group.
- **Shell anatomy:** a fluid **collapsible sidebar** (expanded ↔ icon-rail; persisted collapse state in `localStorage` via a small Zustand store, ADR-0008's ephemeral-client-state lane), a **header wrapper** (tenant switcher + profile menu + offline indicator + the billing banner slot), and a **content region** that the route renders into.
- **Responsiveness via container queries + flex/grid** (Tailwind v4 `@container`): the shell defines breakpoints on its own container, not just the viewport, so it behaves correctly when embedded. Desktop = expanded sidebar; tablet = icon rail; mobile = off-canvas drawer with a hamburger toggle and a backdrop. Touch targets ≥ 44px; the drawer closes on navigation and on backdrop tap.
- **Navigation model is a pure function** `navItemsFor({ role, enabledModules })` → the ordered list of `{ key, label, icon, href }`, so restaurant links appear only when the `restaurant` module is enabled (mirrors the backend module seam, ADR-0005) and role-gated items hide for roles that lack them. **Active state is a pure function** `isActiveNav(pathname, href)` (prefix-aware for nested branch routes). Both are unit-tested; the `Sidebar` component renders them.
- **Tenant switcher:** a header dropdown listing `session.memberships`; selecting one calls `useSession().update({ activeCompanyId })` and forces an access-token re-mint (ADR-0001/0004) using the existing `switch-company` action. **Requires adding `SessionProvider`** to `Providers` (currently absent) — an explicit prerequisite task. The switcher shows the active Company name + a check on the current one.

### D. Unified component style guide (shared primitives)

- New `components/ui/` primitives, all token-driven, all with explicit interactive states:
  - **`Button`** — variants `primary | secondary | ghost | danger`; sizes `sm | md | lg`; props `loading`, `disabled`, `blockedReason?`. States: `:hover` subtle scale-up, `:active` compression (scale-down), `:disabled` (reduced opacity + `cursor-not-allowed` + `pointer-events`/aria-disabled), and `loading` → inline spinner + disabled + preserved width (no layout shift). All scale/press transitions are gated behind `motion-safe:` so `prefers-reduced-motion` is honored (story 24). The variant/size/state → className mapping is a **pure resolver** (`buttonClasses(...)`), unit-tested; the component is a thin wrapper.
  - **`Input`** (+ label/error/hint) — focus ring from tokens, error state from `--color-danger`, disabled state.
  - **`Badge`** — status variants (neutral / success / warning / danger / info) for order/ticket/shift/subscription states; maps domain statuses to a variant via a small pure helper.
  - **`Card`** and **`DataGridCard`** — the standardized surface (border + `--shadow-sm` + radius) used by product tiles, tables, list rows; replaces the repeated `rounded-lg border ... bg-white dark:bg-neutral-900` literal.
  - **`Skeleton`** — shimmer placeholder for async/loading regions (lists, cards), used by the inline-loading pattern and route-level loading.
- **Disabled-during-block contract:** primitives accept a "blocked" affordance so that, during an **offline sync pause** or a **subscription lockout**, action buttons render disabled with an accessible reason (tooltip/`aria-disabled` + reason text). This is the single mechanism stories 14/17 rely on; pages pass the reason from the offline/subscription state.
- **Refactor, don't rewrite:** migrate existing components and flow pages to the primitives/tokens incrementally; behavior and tests stay green.

### E. Aligned flow interceptors (visual contract)

- **Subscription 402 block (ADR-0012):** the `BillingBanner` becomes a **fixed banner slot in the shell header region** that *reserves* layout space (pushes content down) rather than overlaying it — so geometry never breaks (story 17). The existing `bannerState(sub, now)` logic is reused unchanged; only the mount/placement moves into the shell. A hard 402 still routes to `/billing` via the existing `BillingRedirect`; the `/billing` page is styled with the new primitives. Locked actions across the app use the `Button` `blockedReason` contract.
- **Offline-queued indicator (ADR-0013):** a shared **`OfflineIndicator`** in the header driven by a pure `offlineIndicatorState({ online, pendingCount })` → `{ kind: "online" | "queued" | "offline"; count }`. It shows a subtle dot + (when queued) a count, expands to "N change(s) queued — syncing when online," and offers "Retry now" (calls the existing replay `flushNow`/`retrySync`). The per-page POS "Pending sync · N · Retry" pill and the cart's queued affordance are unified into this indicator. State is sourced from TanStack Query's `onlineManager` + the outbox `pendingCount`.

### Affected routes / files (orientation, not prescription)

- Tokens/font: `app/globals.css` (`@theme`), `app/layout.tsx` (`next/font`).
- Landing: `app/page.tsx`, `components/marketing/*`.
- Shell: new `app/(dashboard)/layout.tsx`, move `pos|shifts|returns|restaurant|billing` under it; `components/shell/*` (`AppShell`, `Sidebar`, `Header`, `TenantSwitcher`, `OfflineIndicator`); `lib/shell/*` (`nav-model`, `nav-active`, `offline-indicator-logic`); a `SessionProvider` addition in `app/providers.tsx`.
- Primitives: `components/ui/*`, `lib/ui/button-classes.ts` (+ `cn`).

## Testing Decisions

A good test asserts external behavior through the public interface — pass props/inputs, assert rendered output or returned value — never internals or exact class strings beyond what encodes behavior. Two tiers, matching the existing setup (vitest; `// @vitest-environment jsdom` for components; `@/` alias and automatic JSX already configured in `vitest.config.ts`):

- **Pure logic (node, `*-logic.test.ts` / `*.test.ts`):**
  - `navItemsFor({ role, enabledModules })` — restaurant items appear only when enabled; role-gated items hidden for roles lacking them; stable order.
  - `isActiveNav(pathname, href)` — exact and nested-prefix matches; `/pos/:branch` highlights "POS"; no false positives across sibling routes.
  - `offlineIndicatorState({ online, pendingCount })` — online/queued/offline transitions and the count.
  - `buttonClasses(variant, size, { loading, disabled })` — encodes the disabled/loading invariants (e.g., loading implies disabled) without asserting cosmetic class noise.
  - pricing-tier model (the tiers/labels/CTAs the matrix renders).
- **Components (jsdom + Testing Library):**
  - `Button` — renders variant/size; `disabled`/`blockedReason` blocks `onClick` and exposes the reason; `loading` shows the spinner and is non-interactive; press handlers fire when enabled.
  - `Badge`, `Card`, `Skeleton`, `Input` — render the right state/variant.
  - `Sidebar` — highlights the active item, renders only permitted items, toggles collapsed.
  - `TenantSwitcher` — lists memberships, marks the active one, invokes the switch on select (mock `useSession`/action).
  - `OfflineIndicator` — renders online/queued/offline and fires retry.
  - `BillingBanner` (existing test stays green after the refactor) + a shell test that the banner slot reserves space and doesn't overlap content.
  - Landing sections render hero/feature/pricing content and the CTA links to `/login`.
- Prior art to mirror: `components/pos/attention-banner.test.tsx`, `components/billing/billing-banner.test.tsx`, `lib/billing/banner-logic.test.ts`, `components/billing/billing-redirect.test.tsx` (mocking `next/navigation`).

## Out of Scope

- **KDS / Order Lifecycle** — explicitly deferred; resumes immediately after this sprint.
- **Any backend, schema, or business-logic change.** No new endpoints; flows keep their current data hooks and behavior.
- **Real Stripe price wiring / checkout changes** — the pricing matrix uses a configurable display constant and routes into the existing in-app Subscribe flow (ADR-0012); plugging the real price is the separate billing config step.
- **Per-tenant white-label theming**, i18n/localization, and finalized marketing copy/illustration (placeholder copy + tokenized brand only).
- **A component-library dependency** (shadcn/Radix/MUI) and analytics/SEO instrumentation.
- **New auth screens** beyond styling the existing `/login` with the new primitives (no password reset / signup redesign here).

## Further Notes

- **Sequencing for the red-green phase:** (1) tokens + font foundation, then (2) `ui/` primitives with their pure resolvers, then (3) the shell (nav model → `Sidebar`/`Header` → `(dashboard)` group + `SessionProvider` + `TenantSwitcher`), then (4) the landing page, then (5) fold the interceptors (billing banner slot + `OfflineIndicator`) into the shell and migrate existing pages onto the primitives. The foundation and primitives unblock everything else and should land first.
- **Behavioral safety:** moving routes into the `(dashboard)` group and swapping inline markup for primitives must keep every existing component/page test green; treat any behavior change as a defect for this sprint.
- **Accessibility baselines:** focus-visible rings on all interactives, `aria-disabled` + reason on blocked buttons, `prefers-reduced-motion` gating on scale/press, ≥44px touch targets, and color contrast checked for both themes.
- **Reuse over rebuild:** `bannerState` (billing), the outbox `pendingCount`/`flushNow`, `onlineManager`, and the `switch-company` action already exist — the shell consumes them; it does not duplicate their logic.
- This sprint standardizes the design system so the upcoming KDS screens are built directly on the shell + primitives rather than more bespoke markup.
