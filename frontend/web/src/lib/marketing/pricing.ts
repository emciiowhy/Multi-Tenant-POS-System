/**
 * Pure pricing-tier model for the landing matrix (UI/UX modernization, slice 08).
 * The marketing surface never talks to Stripe: the Standard price is a single
 * configurable *display* constant (placeholder until the real Stripe price is
 * wired, ADR-0012) and every paid CTA routes into the in-app auth/Subscribe flow
 * (`/login` → in-app `/billing`). Kept pure so the tiers/labels/CTAs are tested
 * without rendering.
 */

export interface PricingTier {
  key: "trial" | "standard" | "enterprise";
  name: string;
  /** Display price (e.g. "$49", "Free", "Custom"). */
  price: string;
  /** Billing cadence shown next to the price, when applicable. */
  cadence?: string;
  blurb: string;
  features: string[];
  cta: CtaLink;
  /** The recommended/highlighted plan. */
  featured?: boolean;
}

interface CtaLink {
  label: string;
  href: string;
}

/** Free-trial length — mirrors the backend entitlement constant
 *  (`backend/.../billing/entitlement.logic.ts`); kept as a local display value so
 *  the marketing bundle stays free of backend imports. */
export const TRIAL_DAYS = 14;

/** Standard plan display price (placeholder until the Stripe price is wired). */
export const STANDARD_PRICE_DISPLAY = "$49";

export function pricingTiers(): PricingTier[] {
  return [
    {
      key: "trial",
      name: "Free Trial",
      price: "Free",
      blurb: `Full access for ${TRIAL_DAYS} days — no card required.`,
      features: [
        `${TRIAL_DAYS}-day full-feature trial`,
        "Offline-first register",
        "Single branch",
      ],
      cta: { label: "Start free trial", href: "/login" },
    },
    {
      key: "standard",
      name: "Standard",
      price: STANDARD_PRICE_DISPLAY,
      cadence: "/mo",
      blurb: "Everything a growing multi-branch business needs.",
      features: [
        "Unlimited offline sales + real-time sync",
        "Multi-branch & multi-tenant",
        "Shifts, returns & reporting",
        "Restaurant module (coming soon)",
      ],
      cta: { label: "Get Started", href: "/login" },
      featured: true,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: "Custom",
      blurb: "Dedicated support, SSO, and volume pricing.",
      features: ["Everything in Standard", "Priority support & SLA", "Custom onboarding"],
      cta: { label: "Contact sales", href: "mailto:sales@vendme.app" },
    },
  ];
}
