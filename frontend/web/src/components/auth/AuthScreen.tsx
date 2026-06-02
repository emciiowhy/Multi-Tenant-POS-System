"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSession } from "./SessionProvider";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { OnboardingForm } from "./OnboardingForm";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";
import { authModeFromParam, authModeToParam, type AuthMode } from "@/lib/auth/auth-flow";
import { needsOnboarding } from "@/lib/auth/post-auth";
import { DASHBOARD_HOME } from "@/lib/marketing/landing-cta";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/ui/cn";

/**
 * The unified, split-screen auth surface (Auth overhaul PRD §3/§4). A decorative
 * brand panel beside a form container that swaps between Sign In / Sign Up
 * (segmented control, `?mode=` synced), the Onboarding step, and a
 * Continue/Switch panel for visitors who arrive already signed in.
 *
 * Routing is session-derived. A returning member who **arrives** already
 * authenticated isn't yanked away — they get "Continue / Switch account" (PRD §4
 * stale-session handling). A member who signs in **during this visit** is sent
 * straight to the dashboard. Tenant-less accounts land in onboarding (never the
 * 409 dead-end). Shell-free + token-driven.
 */
export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, companies, account, signOut } = useAppSession();

  const mode = useAuthFlowStore((s) => s.mode);
  const setMode = useAuthFlowStore((s) => s.setMode);

  const urlMode = authModeFromParam(params?.get("mode"));

  // Was the FIRST settled session authenticated? Distinguishes "arrived already
  // signed in" (→ Continue/Switch) from "signed in during this visit" (→ redirect).
  // This intentionally latches via a ref during render — a one-shot memo of first
  // paint; computing it synchronously avoids a post-settle flash of the wrong CTA.
  // Behaviour is covered by AuthScreen.test.tsx, so the conservative react-hooks/refs
  // rule is suppressed locally rather than refactored (which would change timing).
  const arrivedAuthenticatedRef = useRef<boolean | null>(null);
  /* eslint-disable react-hooks/refs */
  if (arrivedAuthenticatedRef.current === null && status !== "loading") {
    arrivedAuthenticatedRef.current = status === "authenticated";
  }
  /* eslint-enable react-hooks/refs */

  const onboarding = status === "authenticated" && needsOnboarding(companies);
  const showSignedIn =
    status === "authenticated" &&
    !needsOnboarding(companies) &&
    // eslint-disable-next-line react-hooks/refs -- render read of the latched ref (see above)
    arrivedAuthenticatedRef.current === true;

  // URL → store (deep-link + back button), only while unauthenticated.
  useEffect(() => {
    if (status !== "authenticated") setMode(urlMode);
  }, [urlMode, status, setMode]);

  // A member who signed in this visit goes straight to the app.
  useEffect(() => {
    if (
      status === "authenticated" &&
      !needsOnboarding(companies) &&
      arrivedAuthenticatedRef.current === false
    ) {
      router.replace(DASHBOARD_HOME);
    }
  }, [status, companies, router]);

  function switchMode(next: AuthMode) {
    setMode(next);
    const param = authModeToParam(next);
    router.replace(param ? `/login?mode=${param}` : "/login");
  }

  return (
    <div className="grid min-h-screen bg-surface text-fg lg:grid-cols-2">
      <aside
        data-testid="brand-panel"
        aria-hidden="true"
        className="hidden flex-col justify-between bg-brand p-12 text-brand-foreground lg:flex"
      >
        <span className="text-xl font-bold tracking-tight">VendMe</span>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">Run the floor — online or off.</h2>
          <p className="max-w-sm text-brand-foreground/80">
            Offline-first point of sale, real-time sync across every branch, and one isolated
            workspace per business.
          </p>
        </div>
        <span className="text-sm text-brand-foreground/70">Multi-tenant POS + ERP</span>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center text-xl font-bold tracking-tight lg:hidden">VendMe</div>

          {onboarding ? (
            <Card>
              <OnboardingForm />
            </Card>
          ) : showSignedIn ? (
            <Card data-testid="signed-in-panel" className="flex flex-col gap-4 text-center">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-fg">You&apos;re already signed in</h1>
                {account?.name && <p className="text-sm text-fg-muted">as {account.name}</p>}
              </div>
              <Button fullWidth onClick={() => router.replace(DASHBOARD_HOME)}>
                Continue to dashboard
              </Button>
              <Button variant="outline" fullWidth onClick={() => signOut()}>
                Switch account
              </Button>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex gap-1 rounded-md border border-border bg-surface-2 p-1">
                <ModeTab active={mode === "signin"} onClick={() => switchMode("signin")}>
                  Sign in
                </ModeTab>
                <ModeTab active={mode === "signup"} onClick={() => switchMode("signup")}>
                  Sign up
                </ModeTab>
              </div>
              <Card>{mode === "signup" ? <SignUpForm /> : <SignInForm />}</Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-brand text-brand-foreground" : "text-fg-muted hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}
