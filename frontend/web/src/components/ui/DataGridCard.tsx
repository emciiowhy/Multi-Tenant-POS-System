"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export interface DataGridCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Highlight as the chosen item (reflected as aria-pressed). */
  selected?: boolean;
}

/**
 * An interactive grid tile (slice 03) — the standardized surface for selectable
 * items like POS product tiles. Card styling + hover/active micro-interactions
 * (motion-safe) + a selected ring; reflects selection as `aria-pressed`.
 */
export const DataGridCard = forwardRef<HTMLButtonElement, DataGridCardProps>(function DataGridCard(
  { selected = false, className, children, type, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={selected}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-1 rounded-card border bg-surface p-3 text-left shadow-card",
        "transition-[transform,border-color,background-color] motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.99]",
        "hover:border-brand hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        selected ? "border-brand ring-2 ring-brand" : "border-border",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
