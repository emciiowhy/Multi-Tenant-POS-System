"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Token-driven text input (slice 03) with an associated label, optional hint,
 * and an error state that marks the control `aria-invalid` and shows the message.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, disabled, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm text-fg-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-10 rounded-md border bg-surface px-3 text-fg outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-brand/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-danger" : "border-border",
          className
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
