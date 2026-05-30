"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Sign in to VendMe</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
