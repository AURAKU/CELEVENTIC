"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveAuthCallbackUrl } from "@/lib/auth/logout";
import {
  findOnboardingIntent,
  ONBOARDING_INTENT_OPTIONS,
  VENDOR_SERVICE_CATEGORIES,
  type OnboardingIntentOption,
} from "@/lib/auth/onboarding-intents";
import type { AccountType } from "@prisma/client";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [joinIntent, setJoinIntent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    username: "",
    country: "GH",
    organizationName: "",
    vendorCategory: "Photographers",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedIntent = useMemo(
    () => findOnboardingIntent(accountType, joinIntent),
    [accountType, joinIntent]
  );

  function selectIntent(option: OnboardingIntentOption) {
    setAccountType(option.id);
    setJoinIntent(option.joinIntent);
    setError("");
    // Drop path-specific leftovers so a prior choice can't fail a new one.
    setForm((prev) => ({
      ...prev,
      username: "",
      organizationName: option.id === "ORGANIZATION" ? prev.organizationName : "",
      vendorCategory:
        option.id === "VENDOR" ? prev.vendorCategory || "Photographers" : "Photographers",
    }));
    setStep(3);
  }

  function buildRegisterPayload() {
    if (!accountType) return null;
    const email = form.email.trim() || undefined;
    const phone = form.phone.trim() || undefined;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email,
      phone,
      password: form.password,
      accountType,
      joinIntent,
      country: form.country || "GH",
    };

    if (accountType === "ORGANIZER" || accountType === "ORGANIZATION") {
      const handle = form.username.trim().toLowerCase();
      if (handle.length >= 3) payload.username = handle;
    }
    if (accountType === "ORGANIZATION") {
      payload.organizationName = form.organizationName.trim();
    }
    if (accountType === "VENDOR") {
      payload.vendorCategory = form.vendorCategory.trim() || "Photographers";
    }
    return payload;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType || !selectedIntent) {
      setError("Please choose what you'd like to do on Celeventic.");
      setStep(2);
      return;
    }
    if (accountType === "ORGANIZATION" && !form.organizationName.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (
      (accountType === "ORGANIZER" || accountType === "ORGANIZATION") &&
      form.username.trim() &&
      form.username.trim().length < 3
    ) {
      setError("Public username must be at least 3 characters, or leave it blank.");
      return;
    }

    const payload = buildRegisterPayload();
    if (!payload) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      const identifier = (form.email || form.phone).trim();
      const result = await signIn("credentials", {
        identifier,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          "Account created, but sign-in failed. Please sign in with your email or phone."
        );
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      router.push(data.redirect || "/dashboard/getting-started");
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setLoading(false);
    }
  }

  const canContinueStep1 =
    form.name.trim().length >= 2 &&
    form.password.length >= 8 &&
    Boolean(form.email.trim() || form.phone.trim());

  return (
    <AuthLayout
      title={
        step === 1
          ? "Create your Celeventic account"
          : step === 2
            ? "What would you like to do?"
            : "Almost done"
      }
      subtitle={
        step === 1
          ? "Sign up in under a minute — email, phone, or Google."
          : step === 2
            ? "Pick the option that fits you best. You can change this later."
            : selectedIntent?.confirmHint ?? "Confirm a few details for your account."
      }
    >
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Username</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="username"
              placeholder="How should we call you?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+233..."
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-slate-500">Email or phone is required.</p>

          <Button
            className="w-full"
            size="lg"
            disabled={!canContinueStep1}
            onClick={() => {
              setError("");
              setStep(2);
            }}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-500">or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() =>
              signIn("google", {
                callbackUrl: resolveAuthCallbackUrl("/auth/onboarding/intent"),
              })
            }
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>

          <div className="grid sm:grid-cols-2 gap-4">
            {ONBOARDING_INTENT_OPTIONS.map((type) => {
              const Icon = type.icon;
              const selected =
                accountType === type.id && joinIntent === type.joinIntent;
              return (
                <button
                  key={`${type.id}-${type.joinIntent}`}
                  type="button"
                  onClick={() => selectIntent(type)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all touch-manipulation min-h-[120px] ${
                    selected
                      ? "border-brand-500 bg-brand-50 shadow-md"
                      : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    {selected && <Check className="h-5 w-5 text-brand-600 shrink-0" />}
                  </div>
                  <h3 className="font-semibold mt-3">{type.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && accountType && selectedIntent && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>

          {error && (
            <div
              className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border p-3 text-sm space-y-1">
            <p>
              Signing up as <span className="font-semibold">{selectedIntent.title}</span>
            </p>
            <p className="text-slate-500 text-xs">{selectedIntent.confirmHint}</p>
          </div>

          {(accountType === "ORGANIZER" || accountType === "ORGANIZATION") && (
            <div className="space-y-2">
              <Label htmlFor="username">Public username (optional)</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm({
                    ...form,
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  })
                }
                placeholder="yourname"
                autoComplete="off"
              />
            </div>
          )}

          {accountType === "ORGANIZATION" && (
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                required
                placeholder="e.g. Grace Community Church"
              />
            </div>
          )}

          {accountType === "VENDOR" && (
            <div className="space-y-2">
              <Label htmlFor="vendorCategory">Primary service category</Label>
              <select
                id="vendorCategory"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.vendorCategory}
                onChange={(e) => setForm({ ...form, vendorCategory: e.target.value })}
              >
                {VENDOR_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Creating account..."
              : accountType === "VENDOR"
                ? "Create account & continue setup"
                : joinIntent
                  ? "Create account & view invites"
                  : "Create Account"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
