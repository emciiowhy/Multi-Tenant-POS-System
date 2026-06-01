import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";

/**
 * Auth route (Auth overhaul). Shell-free (outside the (dashboard) group), it
 * hosts the unified split-screen {@link AuthScreen} that manages Sign In /
 * Sign Up / Onboarding. Wrapped in Suspense because AuthScreen reads
 * `useSearchParams` (the `?mode=` source of truth).
 */
export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
