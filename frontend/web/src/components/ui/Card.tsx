import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

/** The standardized surface (slice 03): the token-driven replacement for the
 *  repeated `rounded-lg border ... bg-white dark:bg-neutral-900` literal. */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface p-4 shadow-card", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
