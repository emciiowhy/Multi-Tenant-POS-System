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

- [ ] `buttonClasses` is pure and unit-tested (variant/size matrix; loading ⇒ disabled invariant) — RED first.
- [ ] `Button` renders each variant/size; `loading` shows a spinner and blocks clicks; `disabled`/`blockedReason` block `onClick` and expose the reason (aria + tooltip).
- [ ] Hover/active transitions are present and gated behind `motion-safe:`.
- [ ] Component tests (jsdom) cover loading, disabled, blocked, and active-click paths.

## Blocked by

- `.scratch/ui-ux-modernization/issues/01-design-tokens-and-typography.md`
