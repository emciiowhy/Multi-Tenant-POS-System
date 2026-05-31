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

- [ ] The status→badge-variant helper is pure and unit-tested.
- [ ] Each primitive renders its states/variants (jsdom): Input error/disabled, Badge variants, Card/DataGridCard surface, Skeleton.
- [ ] All primitives read from the slice-01 tokens (no hardcoded hex/utility literals).

## Blocked by

- `.scratch/ui-ux-modernization/issues/01-design-tokens-and-typography.md`
- `.scratch/ui-ux-modernization/issues/02-button-and-class-resolver.md`
