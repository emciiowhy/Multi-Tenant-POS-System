# Stock and money are append-only ledgers; current state is a projection

Inventory levels and account balances are never mutated in place. Every change is an immutable, append-only event row:

- **Stock movements** — a signed quantity delta with a reason, the originating order, and a `client_uuid`. Firing a menu item expands its Recipe (bill of materials) into one movement per ingredient.
- **Journal lines** — double-entry debit/credit lines posted at settle (e.g. Dr Cash, Cr Revenue, Cr Tax Payable).
- **Payments** — captured tenders, each with a `client_uuid`.

Current on-hand stock and account balances are **projections** — sums over the ledger, materialized for fast reads and rebuildable from the event rows at any time. A refund or void is a **new compensating event** (reversing journal entry, positive stock movement), never an `UPDATE` or `DELETE`.

## Why

- The restaurant flow decouples the moments of stock movement (fire) and revenue recognition (settle); a single mutable "sale" row can't represent that, but independent events naturally can.
- Double-entry accounting requires immutable lines anyway, so unifying inventory onto the same model avoids two consistency regimes that must agree at settle time.
- Offline-first sync needs idempotent replay and deterministic conflict handling: each event carries a client-generated `client_uuid` that is the idempotency key, so replaying a terminal's queued events after reconnect can't double-apply.
- Point-in-time questions ("stock as of 3pm", "trial balance last Tuesday") become replays, satisfying audit-trail and financial-integrity requirements for free.

## Considered Options

- **Mutable columns + audit log:** rejected — offline replay races on the same column, point-in-time is unanswerable, and the audit log is merely descriptive (it can drift from the live numbers).
- **Hybrid (events for money, mutable stock):** rejected — leaves the offline-stock conflict unsolved and lets stock and the general ledger disagree.

## Consequences

- We must build and maintain projections (materialized views or incrementally-maintained tables) and a rebuild path. Read models are eventually consistent with the ledger; UI shows optimistic local state and reconciles on sync.
- "Prevent overselling" is not fully achievable offline (see the conflict-resolution decision) — the model permits negative on-hand and surfaces it rather than blocking it.
