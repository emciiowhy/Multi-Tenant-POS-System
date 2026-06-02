"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { INDUSTRIES, onboardSchema, type Industry } from "@/lib/auth/schemas";
import { slugify } from "@/lib/auth/slugify";
import { createCompany } from "@/app/actions/create-company";
import { useAppSession } from "./SessionProvider";
import { useOnline } from "@/lib/shell/use-connectivity";

const OFFLINE_REASON = "You're offline — reconnect to create your workspace.";

const INDUSTRY_LABELS: Record<Industry, string> = {
  retail: "Retail",
  restaurant: "Restaurant",
  auto_service: "Auto service",
  dealership: "Dealership",
};

/**
 * Onboarding step (Auth overhaul PRD §1.3/§6 — the locked Standard set: name +
 * auto-suggested editable slug + industry). Creates the first tenant via the
 * `createCompany` server action, then `addCompany` folds it into the session so
 * the parent {@link AuthScreen} routes into the dashboard — no re-login.
 */
export function OnboardingForm() {
  const { account, addCompany } = useAppSession();
  const online = useOnline();
  const offlineReason = online ? null : OFFLINE_REASON;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [industry, setIndustry] = useState<Industry>("retail");
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Slug tracks the name until the user edits it by hand.
  const effectiveSlug = slugEdited ? slug : slugify(name);

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // double-submit guard
    setFormError(null);

    if (!online) {
      setFormError(OFFLINE_REASON);
      return;
    }

    const parsed = onboardSchema.safeParse({ name: name.trim(), slug: effectiveSlug, industry });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ name: f.name?.[0], slug: f.slug?.[0] });
      return;
    }
    setErrors({});
    setPending(true);

    const res = await createCompany(parsed.data);
    if (!res.ok || !res.membership) {
      setPending(false);
      if (res.error === "slug_taken") {
        setErrors({ slug: "That workspace URL is taken — try another." });
        setSlug(`${effectiveSlug}-2`);
        setSlugEdited(true);
        return;
      }
      setFormError(
        res.error === "unauthenticated"
          ? "Your session expired — please sign in again."
          : "Couldn't create your workspace. Please try again."
      );
      return;
    }
    // New tenant created → fold it into the session; AuthScreen routes onward.
    await addCompany(res.membership);
    setPending(false);
  }

  return (
    <form
      data-testid="onboarding-form"
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-fg">Create your workspace</h1>
        <p className="text-sm text-fg-muted">
          {account?.name ? `Signed in as ${account.name}. ` : ""}One workspace per business.
        </p>
      </div>

      {formError && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <Input
        label="Business name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        error={errors.name}
      />
      <Input
        label="Workspace URL (slug)"
        value={effectiveSlug}
        onChange={(e) => {
          setSlug(e.target.value);
          setSlugEdited(true);
        }}
        error={errors.slug}
        hint="Lowercase letters, numbers and dashes"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="onboarding-industry" className="text-sm text-fg-muted">
          Industry
        </label>
        <select
          id="onboarding-industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className="h-10 rounded-md border border-border bg-surface px-3 text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {INDUSTRY_LABELS[i]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" fullWidth loading={pending} blockedReason={offlineReason}>
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}
