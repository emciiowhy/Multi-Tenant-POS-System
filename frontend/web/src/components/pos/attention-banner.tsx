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
 * rather than have them silently dropped. */
export function AttentionBanner({ failures, onDismiss }: AttentionBannerProps) {
  if (failures.length === 0) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-300 bg-red-500/10 p-3 dark:border-red-800">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        {failures.length} sale(s) rejected on sync — needs attention
      </p>
      <ul className="mt-2 space-y-1">
        {failures.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-red-700 dark:text-red-300">{f.reason}</span>
            <button
              onClick={() => onDismiss(f.id)}
              className="shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 dark:border-red-700 dark:text-red-400"
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
