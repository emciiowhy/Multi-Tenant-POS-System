"use client";

import { useEffect } from "react";
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
import { cn } from "@/lib/ui/cn";

/**
 * The unified, split-screen auth surface (Auth overhaul PRD §3). A decorative
 * brand panel beside a form container that swaps between Sign In / Sign Up
 * (segmented control, `?mode=` synced) and — once authenticated with no tenant —
 * the Onboarding step. Routing is session-derived: members are sent straight to
 * the dashboard; tenant-less accounts land in onboarding (rather than the 409
 * dead-end). All token-driven + shell-free (lives outside the (dashboard) group).
 */
export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, companies } = useAppSession();

  const mode = useAuthFlowStore((s) => s.mode);
  const setMode = useAuthFlowStore((s) => s.setMode);

  const urlMode = authModeFromParam(params?.get("mode"));

  // URL → store (deep-link + back button), only while unauthenticated.
  useEffect(() => {
    if (status !== "authenticated") setMode(urlMode);
  }, [urlMode, status, setMode]);

  // Session → route: members to the dashboard, tenant-less accounts to onboarding.
  useEffect(() => {
    if (status !== "authenticated") return;
    if (needsOnboarding(companies)) setMode("onboarding");
    else router.replace(DASHBOARD_HOME);
  }, [status, companies, router, setMode]);

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

          {mode === "onboarding" ? (
            <Card>
              <OnboardingForm />
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
        active ? "bg-brand text-brand-foreground" : "text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
