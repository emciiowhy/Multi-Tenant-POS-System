# Primitives: Input, Badge, Card, DataGridCard, Skeleton

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The remaining shared primitives, all token-driven, replacing the repeated inline
markup across pages.

- `Input` (+ label / hint / error) — token focus ring, error and disabled states.
- `Badge` — status variants (neutral / success / warning / danger / info) with a
  small pure helper mapping a domain status (order/ticket/shift/subscription) to
  a variant.
- `Card` and `DataGridCard` — the standardized surface (border + shadow + radius)
  that replaces the `rounded-lg border ... bg-white dark:bg-neutral-900` literal.
- `Skeleton` — shimmer placeholder for async/loading regions.

## Acceptance criteria

- [x] The status→badge-variant helper is pure and unit-tested.
- [x] Each primitive renders its states/variants (jsdom): Input error/disabled, Badge variants, Card/DataGridCard surface, Skeleton.
- [x] All primitives read from the slice-01 tokens (no hardcoded hex/utility literals).

## Blocked by

- `.scratch/ui-ux-modernization/issues/01-design-tokens-and-typography.md`
- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`

## Comments

**Done (2026-06-01), red-green (pure helper first, then components).** Pure `lib/ui/badge-variant.ts`: `badgeVariant(status)` folds subscription / outbox / shift / KDS / table statuses onto `neutral | success | warning | danger` (the variants backed by slice-01 tokens), case-insensitive, **total + safe** — unknown/empty/undefined → `neutral`, never throws. `components/ui/`: `Badge` (status auto-maps; explicit `variant` overrides), `Input` (label via `useId`, `aria-invalid` + message on error, hint, disabled), `Card` (the `rounded-card border-border bg-surface shadow-card` surface replacing the repeated literal), `DataGridCard` (interactive tile — button, `aria-pressed`, hover:border-brand + motion-safe scale, selected ring), `Skeleton` (aria-hidden, `motion-safe:animate-pulse bg-surface-2`, sizing via className). All token-driven.

Tests: `badge-variant.test.ts` (6) + Badge/Input/Card/DataGridCard/Skeleton `.test.tsx` (5/5/3/4/2). Frontend **125 tests**, typecheck clean.
