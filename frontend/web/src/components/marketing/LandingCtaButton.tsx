"use client";

import Link from "next/link";
import { useAppSession } from "@/components/auth/SessionProvider";
import { landingCta } from "@/lib/marketing/landing-cta";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/lib/ui/button-classes";
import { cn } from "@/lib/ui/cn";

/**
 * The session-aware primary CTA (slice 08). Reads `useAppSession().status`, resolves
 * the label/href via the pure {@link landingCta}, and renders a token-styled link
 * (reusing the `buttonClasses` resolver so it matches the `Button` primitive
 * without being a `<button>`). "Get Started" → /login for visitors; "Go to
 * dashboard" for signed-in users.
 */
export function LandingCtaButton({
  size = "lg",
  variant = "primary",
  className,
  testId,
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  testId?: string;
}) {
  const { status } = useAppSession();
  const cta = landingCta({ status });
  return (
    <Link
      href={cta.href}
      data-testid={testId}
      className={cn(buttonClasses(variant, size), className)}
    >
      {cta.label}
    </Link>
  );
}
