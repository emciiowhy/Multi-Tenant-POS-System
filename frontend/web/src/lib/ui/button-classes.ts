import { cn } from "./cn";

/**
 * Pure class resolver for the Button primitive (UI/UX modernization, slice 02).
 * No React, no DOM — given a variant/size/state it returns the token-driven
 * className, so the visual contract (variants, micro-interactions, inert states)
 * is unit-tested in isolation and the component stays a thin wrapper.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonStateOptions {
  loading?: boolean;
  disabled?: boolean;
  /** A non-empty reason (e.g. "Subscription past due", "Offline — queued")
   *  soft-locks the button: inert, not-allowed cursor, reason surfaced by the
   *  component (ADR-0012 lockout / ADR-0013 offline). */
  blockedReason?: string | null;
  fullWidth?: boolean;
}

/** Loading, disabled, or a blockedReason all make the button non-interactive. */
export function isButtonInert(state: ButtonStateOptions = {}): boolean {
  return Boolean(state.loading || state.disabled || state.blockedReason);
}

// Transitions cover transform (the scale) + color/opacity; the scale itself is
// added conditionally below so an inert button never grows on hover.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium select-none " +
  "transition-[transform,background-color,border-color,color,opacity] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:bg-brand-strong",
  secondary: "border border-border bg-surface-2 text-fg hover:bg-surface-2/70",
  outline: "border border-border bg-transparent text-fg hover:bg-surface-2",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  state: ButtonStateOptions = {},
): string {
  const inert = isButtonInert(state);
  return cn(
    BASE,
    SIZES[size],
    VARIANTS[variant],
    state.fullWidth && "w-full",
    inert
      ? "cursor-not-allowed opacity-60"
      : // Micro-interactions only when interactive; gated behind motion-safe so
        // prefers-reduced-motion users get no scaling.
        "cursor-pointer motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
  );
}
