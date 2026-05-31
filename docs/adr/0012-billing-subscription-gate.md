# Billing is a per-request gate over a locally-mirrored Stripe subscription

VendMe is a SaaS from day one (ADR-0005), so a Company (the unit of tenancy *and* billing, ADR-0001) must hold an active subscription to use the product. Rather than scatter entitlement checks across handlers or bake a status into the access token, entitlement is enforced **once, per request, as middleware** on the tenant API, reading a **locally-mirrored** subscription status that a signature-verified Stripe webhook keeps in sync. Stripe is the source of truth; the local mirror is what every request actually reads.

## Decisions

- **A per-request gate, not a JWT claim.** `requireActiveSubscription` runs after authentication (so the Company is resolved from the request context, ADR-0004) and applies the entitlement policy. A blocked Company gets **402 Payment Required** with a machine-readable code (`subscription_required` / `trial_expired` / `past_due` / …). Status in the token would go stale for the token's lifetime and couldn't react to a mid-session lapse or payment; a per-request local read can.

- **The gate is mounted on the tenant API and exempts auth, companies, and billing.** POS, inventory, catalog, shifts, and the Restaurant module are gated; `/v1/auth`, `/v1/companies` (including company-switch), and `/v1/billing` are not — a lapsed Company must always be able to sign in, switch companies, and pay its way back in. The gate runs before the module-enablement check so a lapse returns 402, not a 404 that would leak whether a module is on.

- **Entitlement is one pure decision.** `decideAccess(subscription | null, now)` is the single source of the rules: `active` allowed; `trialing` allowed until the period end; `past_due` allowed within a configurable grace window; `canceled` / `unpaid` / `incomplete` / no-subscription blocked. Trial length and the grace window are named constants. Being pure (no I/O), it is exhaustively unit-tested across every status and boundary, and the gate middleware injects the subscription lookup so it too is tested without a database — the same injectable-dependency pattern as the module-enablement gate and the realtime branch authorizer.

- **Status is mirrored locally; Stripe is the source of truth.** The gate reads the local `subscriptions` row only — never calls Stripe per request — so it is fast and survives a Stripe outage by degrading to the last known status. Stripe is reconciled in only by the webhook.

- **Stripe lives behind an injectable provider; the webhook maps through a pure reducer.** All Stripe I/O (Customer, Checkout, Portal, signature verification) sits behind one provider interface with a lazily-configured real implementation, so the billing service is testable with a fake. `reduceStripeEvent` is a pure function from a minimal typed event to the local change to persist (or nothing for ignored events), so webhook handling is verified with fixtures and no Stripe SDK. It is idempotent: re-delivering an event yields the same state.

- **The webhook is signature-verified, takes the raw body, and runs on the audited cross-company path.** Stripe identifies the Company only by its Stripe customer id, not by our companyId, so the lookup-and-upsert cannot use a tenant GUC; it runs through the explicitly-audited `withoutTenantScope` path (ADR-0002), keyed by the stored customer id. Signature verification needs the unparsed request body, so raw parsing is mounted for the webhook path ahead of the global JSON parser.

- **Every Company starts on a trial, and existing Companies are backfilled.** Company creation seeds a `trialing` subscription against a default plan, so a new (and the demo) Company is usable immediately. Because turning the gate on would otherwise lock out Companies created before billing existed, a backfill grants a trial to any Company without a subscription.

- **A 402 routes the client to billing without losing work.** The web API client turns a 402 into a typed billing error that routes the user to `/billing` (showing trial/active/past-due status with Subscribe and Manage actions) rather than surfacing a raw error; a banner warns before a trial ends or while a payment is past due. The offline replay engine (ADR-0009) treats a 402 like the existing dead-session 401: stop draining and prompt for billing, but leave the queued sales pending so they replay idempotently (ADR-0006) once billing is restored — a 402 is neither a transport failure to retry forever nor a per-event rejection to discard.

## Consequences

- **Entitlement is binary in v1.** The gate distinguishes entitled from blocked; plan `limits` and usage counters (seats, storage) exist in the schema but are not enforced here. Quota/usage enforcement, if needed, is a separate decision.
- **The exempt paths are load-bearing.** Auth, company-switch, and all of `/v1/billing` must never be gated; a regression that gates them would strand a lapsed Company with no way to recover.
- **Webhook idempotency is mandatory**, since Stripe re-delivers — guaranteed by the pure reducer plus upsert-by-customer (and the per-Company invoice number unique key for the audit rows).
- **Live billing is a configuration prerequisite, not a code one.** Stripe test/live keys, a price id per plan, and the webhook signing secret are operator-supplied; the env, build, and example-config plumbing is in place and the gate/trial work without them. Before enforcing the gate in a deployed environment, existing Companies must be backfilled so they aren't locked out.
