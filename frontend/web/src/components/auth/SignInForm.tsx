"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signInSchema } from "@/lib/auth/schemas";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";
import { useOnline } from "@/lib/shell/use-connectivity";

const OFFLINE_REASON = "You're offline — reconnect to sign in.";

/**
 * Sign-in form (Auth overhaul PRD §1.1). Validates with `signInSchema`, then
 * `signIn` (NextAuth credentials, redirect:false). Success routing is owned by
 * the parent {@link AuthScreen} (session-aware: dashboard vs. onboarding); this
 * form only triggers auth and surfaces failures. Prefills the email handed over
 * from a duplicate-email sign-up.
 */
export function SignInForm() {
  const setMode = useAuthFlowStore((s) => s.setMode);
  const pendingEmail = useAuthFlowStore((s) => s.pendingEmail);

  const online = useOnline();
  const offlineReason = online ? null : OFFLINE_REASON;

  const [email, setEmail] = useState(pendingEmail ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // double-submit guard
    setFormError(null);

    // Auth needs the network — it can't be queued like an offline POS sale.
    if (!online) {
      setFormError(OFFLINE_REASON);
      return;
    }

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setPending(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) {
      setPassword("");
      setFormError("Invalid email or password");
      return;
    }
    // Success → AuthScreen's session effect routes (dashboard / onboarding).
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {formError && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <Button type="submit" fullWidth loading={pending} blockedReason={offlineReason}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-fg-muted">
        New to VendMe?{" "}
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="font-medium text-brand hover:underline"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}
