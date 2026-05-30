# Resend + react-email for transactional email

Transactional email (verification, password reset, receipts, invoices, alerts) is sent via Resend, with templates authored in react-email (`.tsx`). Sends are enqueued through the BullMQ `email` queue rather than called inline.

## Why

- react-email lets templates live in the same React/TypeScript stack as the rest of the product, so they're maintainable by the same engineers and type-checked.
- Resend's API and webhooks are simple and fast to integrate; deliverability is good enough for v1. Postmark edges it on raw deliverability/analytics and remains the fallback option if deliverability becomes a problem; SES is cheapest at large volume but carries the most operational burden (warmup, bounce handling, templating) and was rejected for v1.

## Consequences

- An email-provider seam (interface in `packages/jobs` or `packages/domain`) keeps Resend swappable for Postmark/SES later without touching call sites.
- All sends go through the queue, so a provider outage degrades gracefully (retries) instead of failing the originating request.
