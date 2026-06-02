"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signUpSchema, toRegisterPayload } from "@/lib/auth/schemas";
import { registerAccount } from "@/app/actions/register";
import { useAuthFlowStore } from "@/lib/auth/auth-flow-store";
import { useOnline } from "@/lib/shell/use-connectivity";

const OFFLINE_REASON = "You're offline — reconnect to create your account.";

/**
 * Sign-up form (Auth overhaul PRD §1.2). Validates with `signUpSchema`
 * (incl. the client-only confirm-password match), registers via the server
 * action, then signs the new account in — the parent {@link AuthScreen} sees a
 * tenant-less session and advances to onboarding. A duplicate email offers a
 * one-tap hop to sign-in with the email carried over.
 */
export function SignUpForm() {
  const setMode = useAuthFlowStore((s) => s.setMode);
  const setPendingEmail = useAuthFlowStore((s) => s.setPendingEmail);
  const online = useOnline();
  const offlineReason = online ? null : OFFLINE_REASON;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // double-submit guard
    setFormError(null);
    setEmailTaken(false);

    if (!online) {
      setFormError(OFFLINE_REASON);
      return;
    }

    const parsed = signUpSchema.safeParse({
      email,
      password,
      confirmPassword,
      displayName: displayName || undefined,
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        email: f.email?.[0],
        password: f.password?.[0],
        confirmPassword: f.confirmPassword?.[0],
        displayName: f.displayName?.[0],
      });
      return;
    }
    setErrors({});
    setPending(true);

    const res = await registerAccount(toRegisterPayload(parsed.data));
    if (!res.ok) {
      setPending(false);
      if (res.error === "email_taken") {
        setEmailTaken(true);
        setErrors({ email: "That email is already registered" });
        return;
      }
      setFormError(
        res.error === "invalid"
          ? "Please check your details and try again."
          : "Something went wrong. Please try again.",
      );
      return;
    }
    // Account created → sign in seamlessly; AuthScreen routes into onboarding.
    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
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
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="At least 8 characters"
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
      />
      <Input
        label="Display name (optional)"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        error={errors.displayName}
      />

      {emailTaken && (
        <button
          type="button"
          onClick={() => {
            setPendingEmail(email);
            setMode("signin");
          }}
          className="text-left text-sm font-medium text-brand hover:underline"
        >
          Sign in instead
        </button>
      )}

      <Button type="submit" fullWidth loading={pending} blockedReason={offlineReason}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="font-medium text-brand hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
