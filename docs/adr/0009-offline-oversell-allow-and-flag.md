# Offline sales always complete; overselling is surfaced, not prevented

A POS terminal that is offline cannot verify authoritative stock, and stock cannot be truly reserved across disconnected terminals. Rather than block sales (which would break offline-first and still race), VendMe **always lets an offline sale complete**. The append-only ledger (ADR-0006) permits negative on-hand — it is just a sum of movements. On sync, any item whose projected on-hand is negative raises an alert and a reconciliation task. When a terminal *is* online, a soft-reserve reduces (but cannot eliminate) races.

## Why

- "Offline-first" and "never let a customer be falsely refused" are explicit product requirements; blocking at zero requires an online authoritative check, contradicting both.
- Negative on-hand is meaningful data in an event-sourced model, not a corruption — it signals a real-world stock discrepancy worth a human's attention.

## Consequences

- The UI must never present "out of stock" as a hard block in the POS sell path; at most a soft warning.
- Reconciliation tasks and negative-stock alerts are a first-class part of the inventory module, not an afterthought.
- True hard-reservation semantics (if ever needed for scarce/serialized goods) would be a separate online-only feature, not the default.
