import Link from "next/link";
import { buttonClasses } from "@/lib/ui/button-classes";
import { LandingCtaButton } from "./LandingCtaButton";

/**
 * Marketing hero (slice 08): the core promise + the session-aware primary CTA.
 * Token-driven throughout (`bg-surface`/`text-fg`/`text-fg-muted`), shell-free.
 */
export function LandingHero() {
  return (
    <section data-testid="landing-hero" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-fg-muted">
          Offline-first · Multi-tenant · Real-time
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-fg sm:text-5xl md:text-6xl">
          The offline-resilient point of sale for modern retail &amp; restaurants
        </h1>
        <p className="max-w-2xl text-lg text-fg-muted">
          Sell straight through outages, sync in real time across every branch, and run one tenant
          or a hundred — VendMe keeps the register running and the books straight.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LandingCtaButton testId="hero-cta" />
          <Link href="#pricing" className={buttonClasses("outline", "lg")}>
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
