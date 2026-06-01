import Link from "next/link";
import { buttonClasses } from "@/lib/ui/button-classes";
import { LandingCtaButton } from "@/components/marketing/LandingCtaButton";
import { LandingHero } from "@/components/marketing/LandingHero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { PricingMatrix } from "@/components/marketing/PricingMatrix";

/**
 * Landing page (UI/UX modernization, slice 08). A conversion-focused marketing
 * surface at `/`, deliberately *outside* the `(dashboard)` route group so it
 * carries no shell chrome. Token-driven throughout (slice 01) and built on the
 * slice 02/03 primitives. The primary CTA is session-aware via `useAppSession`
 * (slice 06): "Get Started" for visitors, "Go to dashboard" for signed-in users.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-fg">
            Vend<span className="text-brand">Me</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="#pricing"
              className="hidden px-3 py-2 text-sm text-fg-muted hover:text-fg sm:inline"
            >
              Pricing
            </Link>
            <Link href="/login" className={buttonClasses("ghost", "sm")}>
              Sign in
            </Link>
            <LandingCtaButton size="sm" />
          </div>
        </nav>
      </header>

      <main>
        <LandingHero />
        <FeatureGrid />
        <PricingMatrix />

        <section className="border-t border-border bg-surface-2">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg">
              Ready to keep selling — online or off?
            </h2>
            <p className="max-w-xl text-fg-muted">
              Set up your store in minutes. Your free trial starts the moment you sign up.
            </p>
            <LandingCtaButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-fg-muted sm:flex-row">
          <span>
            Vend<span className="text-brand">Me</span> — multi-tenant POS + ERP
          </span>
          <span>© {new Date().getFullYear()} VendMe</span>
        </div>
      </footer>
    </div>
  );
}
