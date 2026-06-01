"use client";

export interface AttentionFailure {
  id: string;
  reason: string;
}

export interface AttentionBannerProps {
  failures: AttentionFailure[];
  onDismiss: (id: string) => void;
}

/** Surfaces sales the server rejected on sync so a cashier can act on them
 * rather than have them silently dropped. Token-driven (slice 09). */
export function AttentionBanner({ failures, onDismiss }: AttentionBannerProps) {
  if (failures.length === 0) return null;
  return (
    <div className="mb-3 rounded-card border border-danger/40 bg-danger-bg p-3">
      <p className="text-sm font-medium text-danger">
        {failures.length} sale(s) rejected on sync — needs attention
      </p>
      <ul className="mt-2 space-y-1">
        {failures.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-danger">{f.reason}</span>
            <button
              type="button"
              onClick={() => onDismiss(f.id)}
              className="shrink-0 rounded-md border border-danger/40 px-2 py-0.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
