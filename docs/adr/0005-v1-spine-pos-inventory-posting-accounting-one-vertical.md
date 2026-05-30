# v1 builds one deep vertical slice; other modules are stubbed at the seam

The product spec spans POS, ERP, Accounting, HR/Payroll, CRM, Inventory, three industry verticals, AI, and billing. Building all of it at once yields a hollow shell with no working end-to-end workflow. v1 therefore builds **one slice all the way down** and stubs everything else at its module boundary.

## Built deep in v1

- Multi-tenant core: Account/Company/Membership, RBAC, RLS (ADR-0001/0002/0004).
- **POS**: cart → tender → receipt, offline-first sync, shifts, returns/refunds.
- **Inventory**: stock deduction with conflict resolution.
- **Accounting as a posting target only**: sales and refunds auto-generate journal entries into a chart of accounts, proving double-entry integrity. No AP/AR, bank-rec, or budgeting yet.
- **Plug-in / module framework + the Restaurant vertical** (order lifecycle, Kitchen Display System, floor/table state). Chosen over Retail because it actually exercises module-injected workflow + realtime rather than duplicating the base POS.
- **Billing**: a subscription gate, so it is genuinely a SaaS from day one.

## Stubbed at the seam (interface defined, no implementation)

HR/Payroll, CRM, accounts payable/receivable, bank reconciliation, budgeting, AI features, and the other two industry verticals. These exist as module contracts so the plug-in architecture is proven, but carry no business logic in v1.

## Why this is recorded

The "explicit no" is the valuable part: a future reader finding empty module interfaces should know they are deliberate seams, not unfinished work. It also commits us to validating the plug-in framework against one real consumer before generalizing to many.
