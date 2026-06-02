"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import {
  buttonClasses,
  isButtonInert,
  type ButtonSize,
  type ButtonVariant,
} from "@/lib/ui/button-classes";
import { cn } from "@/lib/ui/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show an inline spinner and block interaction (async actions). */
  loading?: boolean;
  /** Soft-lock with a reason (subscription lockout / offline pause). Stays
   *  focusable so the reason is reachable by tooltip and assistive tech. */
  blockedReason?: string | null;
  fullWidth?: boolean;
}

/**
 * The Button primitive (slice 02). All interactive states live here: hover
 * scale, active compression (both motion-safe), disabled/loading, and the
 * blockedReason lockout. Class generation is delegated to the pure
 * {@link buttonClasses}; this wraps it with the spinner and click-guard.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    blockedReason = null,
    fullWidth = false,
    disabled = false,
    className,
    children,
    onClick,
    type,
    ...rest
  },
  ref
) {
  const inert = isButtonInert({ loading, disabled, blockedReason });
  // Hard states (disabled/loading) use the native attribute; a blockedReason is
  // a soft lock (focusable for its tooltip), guarded in JS instead.
  const hardDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        buttonClasses(variant, size, { loading, disabled, blockedReason, fullWidth }),
        className
      )}
      disabled={hardDisabled}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      title={blockedReason ?? undefined}
      data-blocked={blockedReason ? "" : undefined}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      data-testid="button-spinner"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 motion-safe:animate-spin"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
