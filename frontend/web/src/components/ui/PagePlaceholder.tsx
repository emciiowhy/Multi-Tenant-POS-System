import type { ReactNode } from "react";

/**
 * A high-fidelity placeholder for modules that are navigable but not yet built.
 * Renders a real page header (so the route looks first-class in the shell) above
 * a dashed "coming soon" panel. Token-driven throughout.
 */
export function PagePlaceholder({ title, message }: { title: string; message: ReactNode }) {
  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
      </header>
      <div className="flex min-h-[40vh] items-center justify-center rounded-card border border-dashed border-border bg-surface p-8 text-center">
        <p className="max-w-sm text-sm text-fg-muted">{message}</p>
      </div>
    </div>
  );
}
