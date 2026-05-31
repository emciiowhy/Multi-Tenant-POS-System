# Foundation: design tokens + typography

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/ui-ux-modernization/PRD.md`

## What to build

The token + typography layer everything else reads from. Tailwind v4 is CSS-first
here (no `tailwind.config.*`), so semantic tokens live in an `@theme` block in
`globals.css`, and a web font is wired via `next/font`.

- Semantic tokens (light + dark): brand scale (emerald, the single re-theme
  point), surfaces, foreground/muted, border, and status (success / warning /
  danger) plus their subtle backgrounds; radius, shadow, and motion
  (duration/ease) tokens.
- A variable web font (Inter) via `next/font`, exposed as `--font-sans` and
  applied on `html`/`body`. A small type scale (display / h1–h3 / body / caption).
- Dark mode keeps working via `color-scheme` + Tailwind `dark:`.

## Acceptance criteria

- [x] `globals.css` defines an `@theme` token set (color/radius/shadow/motion) with light and dark values; no component hardcodes a hex.
- [x] Brand hue is a single token; changing it re-themes the app without touching components.
- [x] Inter (or chosen font) loads via `next/font` and is the default UI font; a type scale is available.
- [x] The app builds and renders with the font + tokens; existing component tests stay green.
- [x] `prefers-color-scheme` dark values are defined for every surface/fg/border token.

## Blocked by

None - can start immediately.

## Comments

**Done (2026-06-01).** Tailwind v4 CSS-first token layer in `globals.css`: runtime semantic vars on `:root` (surface/surface-2/fg/fg-muted/border, brand + brand-strong/foreground, success/warning/danger + subtle bg), remapped from Tailwind's built-in palette (canonical values, not hand-rolled hex) and switched under `@media (prefers-color-scheme: dark)`; `@theme inline` exposes them as utilities (`bg-surface`, `text-fg`, `border-border`, `bg-brand`, …) **by reference**, so they flip with the theme without a `dark:` variant on every element. Brand = `--brand` (emerald) — one edit re-themes. Radius/shadow/motion tokens added. `next/font` Inter wired in `layout.tsx` as `--font-inter` → mapped to `--font-sans`; `body` uses `font-sans` + `bg-surface`/`text-fg`.

Verified: frontend typecheck clean (next/font wiring), full frontend suite **87/87** (no regression), and `globals.css` **compiles cleanly through the Tailwind v4 PostCSS pipeline** with all eight probed semantic utilities generating + `--font-sans` emitted (offline compile check, since a full `next build` here needs auth env + a font fetch). Visual confirmation is the `next dev` gate. Brand/font are the recommended emerald/slate + Inter default (single-token swap).
