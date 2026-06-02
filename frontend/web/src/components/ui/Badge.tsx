import type { HTMLAttributes } from "react";
import { badgeVariant, type BadgeVariant } from "@/lib/ui/badge-variant";
import { cn } from "@/lib/ui/cn";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Explicit variant; wins over `status`. */
  variant?: BadgeVariant;
  /** A system status mapped to a variant via {@link badgeVariant}. */
  status?: string;
}

/** Status pill (slice 03). Pass a `status` to auto-map the colour, or `variant`
 *  to force one. */
export function Badge({ variant, status, className, children, ...rest }: BadgeProps) {
  const resolved = variant ?? (status ? badgeVariant(status) : "neutral");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANT_CLASS[resolved],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
