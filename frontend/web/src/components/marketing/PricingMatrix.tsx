import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/lib/ui/button-classes";
import { cn } from "@/lib/ui/cn";
import { pricingTiers } from "@/lib/marketing/pricing";

/**
 * Pricing matrix (slice 08). Renders the pure {@link pricingTiers} model; the
 * Standard tier is highlighted and every paid CTA routes into the in-app auth /
 * Subscribe flow (never Stripe from marketing). Token-driven surfaces via `Card`.
 */
export function PricingMatrix() {
  const tiers = pricingTiers();
  return (
    <section id="pricing" data-testid="pricing" className="bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-fg">
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-fg-muted">
          Start free — no card required. Upgrade when you’re ready.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.key}
              className={cn("flex flex-col gap-5", t.featured && "ring-2 ring-brand")}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-fg">{t.name}</h3>
                {t.featured && <Badge variant="success">Most popular</Badge>}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-fg">{t.price}</span>
                {t.cadence && <span className="text-sm text-fg-muted">{t.cadence}</span>}
              </div>

              <p className="text-sm text-fg-muted">{t.blurb}</p>

              <ul className="flex flex-1 flex-col gap-2 text-sm text-fg">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-brand">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={t.cta.href}
                className={buttonClasses(t.featured ? "primary" : "outline", "md", {
                  fullWidth: true,
                })}
              >
                {t.cta.label}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
