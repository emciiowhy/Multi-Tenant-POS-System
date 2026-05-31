# Reconcile rejected sales + provisional/confirmed receipt

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/phase-8b-offline-outbox/PRD.md`

## What to build

Close the reconciliation loop for synced sales.

A queued sale the server `rejected` (e.g. a deleted product, a forbidden action)
is surfaced in the UI for cashier attention — visible and actionable, never
silently dropped. The receipt distinguishes **provisional** (offline; client-
computed totals equal the tendered amount) from **confirmed** (synced; server-
authoritative totals computed at fire). On successful sync, the canonical server
receipt is fetched and shown; if the server `grandTotal` differs from the
tendered amount, the sale is flagged for reconciliation rather than silently
reconciled.

Overselling that happened offline must not be blocked at sell time and surfaces
via the existing `stock.changed` / inventory-alert path (ADR-0009) — no new
blocking logic is added here; this slice only owns the rejected-sale flag and
the receipt state.

## Acceptance criteria

- [x] A queued sale the server rejects is surfaced for cashier attention (visible, actionable) and not dropped.
- [x] A receipt clearly shows provisional (offline, client totals) vs confirmed (synced, server totals).
- [x] On successful sync, the canonical server receipt (authoritative totals at fire) is fetched and displayed.
- [x] If the server `grandTotal` differs from the tendered amount, the sale is flagged for reconciliation.
- [x] Overselling offline is not blocked at sell time; no new stock-gating is introduced (surfacing remains the inventory module's `stock.changed`/alert responsibility).

## Blocked by

- `.scratch/phase-8b-offline-outbox/issues/02-replay-engine-reconnect-backoff.md`

## Comments

**Done (2026-05-31), red-green.** `components/pos/sale-receipt.tsx` (provisional/confirmed/rejected states + total-mismatch reconciliation note) and `components/pos/attention-banner.tsx` (rejected sales list + dismiss) — the **first jsdom + Testing Library component tests** (8 tests; added `jsdom` + `@testing-library/react` + a `vitest.config.ts` setting the automatic JSX runtime). Pure `moneyEquals` (cart-logic) for mismatch detection; `Outbox.remove` to acknowledge a rejected sale. Hooks `useOutboxEntry` (live status+reason) and `useOutboxFailed` drive the page: the receipt tracks the charged batch's live status (provisional→confirmed→rejected), fetches the canonical server receipt on confirm, and flags a tendered-vs-server total mismatch; an `AttentionBanner` surfaces rejected sales with dismiss. The sell path is unchanged — no stock-gating added (oversell stays the inventory `stock.changed`/alert path, ADR-0009).

**12 new frontend tests → 55 total**; workspace typecheck 8/8; full suite 8/8. This slice also closes the standing gap: the POS React layer now has component coverage.

**Phase 8b (offline-first outbox) is complete** — issues 01–04 all done.
