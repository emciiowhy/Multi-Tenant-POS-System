# Primitive: Button + pure class resolver

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The interactive-states centerpiece (PRD spec 3). A pure `buttonClasses` resolver
plus a thin `Button` component, so every button in the app has explicit, uniform
states.

- `buttonClasses(variant, size, { loading, disabled })` — pure, returns the
  token-driven classes; encodes invariants (loading implies non-interactive).
- `Button` — variants `primary | secondary | ghost | danger`; sizes `sm|md|lg`;
  props `loading`, `disabled`, `blockedReason?`. States: `:hover` subtle
  scale-up, `:active` compression, `:disabled` (opacity + `cursor-not-allowed` +
  `aria-disabled`, blocks `onClick`), `loading` → inline spinner, non-interactive,
  no width shift. All scale/press gated behind `motion-safe:`.
- A tiny `cn` class-merge helper.

## Acceptance criteria

- [x] `buttonClasses` is pure and unit-tested (variant/size matrix; loading ⇒ disabled invariant) — RED first.
- [x] `Button` renders each variant/size; `loading` shows a spinner and blocks clicks; `disabled`/`blockedReason` block `onClick` and expose the reason (aria + tooltip).
- [x] Hover/active transitions are present and gated behind `motion-safe:`.
- [x] Component tests (jsdom) cover loading, disabled, blocked, and active-click paths.

## Blocked by

- `.scratch/ui-ux-modernization/issues/01-design-tokens-and-typography.md`

## Comments

**Done (2026-06-01), red-green.** Variants: `primary | secondary | outline | ghost | danger` (the four requested + `danger` for the existing destructive actions, e.g. Close shift); sizes `sm | md | lg`. Pure resolver `lib/ui/button-classes.ts` — `buttonClasses(variant, size, state)` + `isButtonInert(state)`; the scale micro-interactions (`motion-safe:hover:scale-[1.02]` / `active:scale-[0.98]`) are added **only when interactive** so an inert button never grows, and are always `motion-safe`-gated (reduced-motion safe). Inert = `loading || disabled || blockedReason` → `cursor-not-allowed opacity-60`, no scale. `lib/ui/cn.ts` is a tiny truthy-join (no tailwind-merge needed). `components/ui/Button.tsx` is a thin wrapper: hard states (`disabled`/`loading`) set the native `disabled` attr; a `blockedReason` is a **soft lock** (focusable, `aria-disabled`, `title`=reason, JS click-guard) so the lockout reason is reachable — this is the contract slice 07 wires for subscription-block (ADR-0012) and offline-pause (ADR-0013). Loading renders an aria-hidden spinner + `aria-busy`.

Tests: `button-classes.test.ts` (8 — variants, motion-safe gating incl. "no ungated scale", disabled/loading inert, loading⇒inert invariant, blockedReason lockout) + `Button.test.tsx` (5 — variant class, spinner+block on loading, disabled blocks onClick, blockedReason focusable+reason+blocked, enabled click). Split into the pure (node) + component (jsdom) files per the repo convention rather than one `Button.test.ts`. Frontend **100 tests**, typecheck clean.
