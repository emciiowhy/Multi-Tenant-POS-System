import type { PosEvent, PosEventResult } from "@vendme/contracts";
import type { OutboxEntry } from "../outbox/types";
import { backoffDelay, classifyResults, isAuthError, isBillingError } from "./replay-logic";

/** The slice of the Outbox the engine drives. */
export interface ReplayOutbox {
  pending(): OutboxEntry[];
  markApplied(id: string): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
  markRetry(id: string, reason: string): Promise<void>;
}

/** Connectivity signal (wraps TanStack Query's onlineManager in the app). */
export interface OnlineSignal {
  isOnline(): boolean;
  subscribe(onChange: () => void): () => void;
}

export interface ReplayEngineDeps {
  outbox: ReplayOutbox;
  submit: (events: PosEvent[]) => Promise<PosEventResult[]>;
  online: OnlineSignal;
  /** Called when a batch still 401s after apiFetch's transparent re-mint — a
   * dead session that needs re-login. */
  onAuthError?: () => Promise<void> | void;
  /** Called when a batch is blocked by the subscription gate (402) — the Company
   * must subscribe/pay; the user is sent to billing and the queue is preserved. */
  onBillingRequired?: () => Promise<void> | void;
  baseMs?: number;
  capMs?: number;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "transport error";
}

/**
 * Drains the Outbox to the server when online (PRD: Phase 8b, issue 02). Serial
 * FIFO; idempotent (duplicate counts as applied, ADR-0006); transport failures
 * back off and retry; business rejections are flagged and skipped; a dead
 * session stops the drain and the queue survives. Pure decision logic lives in
 * replay-logic; everything stateful/scheduled is injected for testing.
 */
export class ReplayEngine {
  private readonly outbox: ReplayOutbox;
  private readonly submit: ReplayEngineDeps["submit"];
  private readonly online: OnlineSignal;
  private readonly onAuthError?: ReplayEngineDeps["onAuthError"];
  private readonly onBillingRequired?: ReplayEngineDeps["onBillingRequired"];
  private readonly baseMs: number;
  private readonly capMs: number;

  private draining = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(deps: ReplayEngineDeps) {
    this.outbox = deps.outbox;
    this.submit = deps.submit;
    this.online = deps.online;
    this.onAuthError = deps.onAuthError;
    this.onBillingRequired = deps.onBillingRequired;
    this.baseMs = deps.baseMs ?? 1000;
    this.capMs = deps.capMs ?? 60000;
  }

  /** React to connectivity; flush now if already online. */
  start(): void {
    this.unsubscribe = this.online.subscribe(() => {
      if (this.online.isOnline()) void this.flush();
    });
    if (this.online.isOnline()) void this.flush();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearTimer();
  }

  /** Clear any backoff and drain immediately (manual "retry now" / post-charge). */
  flushNow(): Promise<void> {
    this.clearTimer();
    return this.flush();
  }

  /** Drain the queue once, serially in FIFO order. No-op while offline or already draining. */
  async flush(): Promise<void> {
    if (this.draining || !this.online.isOnline()) return;
    this.draining = true;
    try {
      for (const entry of this.outbox.pending()) {
        try {
          const outcome = classifyResults(await this.submit(entry.events));
          if (outcome === "applied") await this.outbox.markApplied(entry.id);
          else await this.outbox.markFailed(entry.id, outcome.rejected);
        } catch (err) {
          if (isAuthError(err)) {
            await this.onAuthError?.();
            return; // dead session: stop draining; queue survives
          }
          if (isBillingError(err)) {
            await this.onBillingRequired?.();
            return; // subscription block: stop draining; queue survives, replays after billing
          }
          await this.outbox.markRetry(entry.id, errorMessage(err));
          this.scheduleRetry(entry.attempts + 1);
          return; // transport down: stop; remaining entries retry next pass
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private scheduleRetry(attempts: number): void {
    this.clearTimer();
    this.timer = setTimeout(
      () => {
        this.timer = null;
        void this.flush();
      },
      backoffDelay(attempts, this.baseMs, this.capMs)
    );
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
