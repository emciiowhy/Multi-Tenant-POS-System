import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/** Decorative shimmer placeholder (slice 03) for async/loading regions. Sizing
 *  comes from the passed className; pulse is motion-safe-gated. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="skeleton"
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-md bg-surface-2", className)}
      {...rest}
    />
  );
}
