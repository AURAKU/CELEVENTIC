"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupProgress } from "@/components/auth/signup-progress";
import { OnboardingIntentGrid } from "@/components/auth/onboarding-intent-grid";
import { resolveAuthCallbackUrl } from "@/lib/auth/logout";
import { safeReturnPath, smartCardStartPath } from "@/lib/auth/safe-next-path";
import {
  findOnboardingIntent,
  intentFromQuery,
  ONBOARDING_INTENT_OPTIONS,
  persistSignupIntent,
  VENDOR_SERVICE_CATEGORIES,
  type OnboardingIntentOption,
} from "@/lib/auth/onboarding-intents";
import type { AccountType } from "@prisma/client";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { CeleYouUsernameField } from "@/components/digital-business-card/celeyou-username-field";

function GoogleIcon() {
  return (
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
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const preset = intentFromQuery(searchParams.get("intent") ?? searchParams.get("role"));
  const [step, setStep] = useState(preset ? 2 : 1);
  const [accountType, setAccountType] = useState<AccountType | null>(preset?.id ?? null);
  const [joinIntent, setJoinIntent] = useState(preset?.joinIntent ?? false);
  const [intentKey, setIntentKey] = useState(preset?.queryKey ?? null);
  const [contactMode, setContactMode] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
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
    () =>
      ONBOARDING_INTENT_OPTIONS.find((option) => option.queryKey === intentKey) ??
      findOnboardingIntent(accountType, joinIntent) ??
      preset ??
      null,
    [intentKey, accountType, joinIntent, preset]
  );

  useEffect(() => {
    if (!preset) return;
    setAccountType(preset.id);
    setJoinIntent(preset.joinIntent);
    setIntentKey(preset.queryKey);
  }, [preset]);

  function selectIntent(option: OnboardingIntentOption) {
    setAccountType(option.id);
    setJoinIntent(option.joinIntent);
    setIntentKey(option.queryKey);
    setError("");
    setForm((prev) => ({
      ...prev,
      username: "",
      organizationName: option.id === "ORGANIZATION" ? prev.organizationName : "",
      vendorCategory:
        option.id === "VENDOR" ? prev.vendorCategory || "Photographers" : "Photographers",
    }));
    persistSignupIntent({
      id: option.id,
      joinIntent: option.joinIntent,
      queryKey: option.queryKey,
      productIntent: option.queryKey === "smartcard" ? "celecard" : undefined,
      organizationName: option.id === "ORGANIZATION" ? form.organizationName : undefined,
      vendorCategory: option.id === "VENDOR" ? form.vendorCategory : undefined,
    });
    setStep(2);
  }

  function rememberIntent() {
    if (!accountType) return;
    persistSignupIntent({
      id: accountType,
      joinIntent,
      queryKey: selectedIntent?.queryKey,
      productIntent: selectedIntent?.queryKey === "smartcard" ? "celecard" : undefined,
      organizationName: form.organizationName.trim() || undefined,
      vendorCategory: form.vendorCategory || undefined,
    });
  }

  function buildRegisterPayload() {
    if (!accountType) return null;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: contactMode === "email" ? form.email.trim() || undefined : undefined,
      phone: contactMode === "phone" ? form.phone.trim() || undefined : undefined,
      password: form.password,
      accountType,
      joinIntent,
      country: form.country || "GH",
    };
    if (selectedIntent?.queryKey === "smartcard") {
      payload.productIntent = "celecard";
    }

    const handle = form.username.trim().toLowerCase();
    if (handle.length >= 3) payload.username = handle;
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
      setError("Please choose how you'll use Celeventic.");
      setStep(1);
      return;
    }
    if (accountType === "ORGANIZATION" && !form.organizationName.trim()) {
      setError("Organisation name is required.");
      return;
    }
    if (contactMode === "email" && !form.email.trim()) {
      setError("Enter your email, or switch to phone.");
      return;
    }
    if (contactMode === "phone" && form.phone.trim().length < 10) {
      setError("Enter a valid phone number, or switch to email.");
      return;
    }

    const payload = buildRegisterPayload();
    if (!payload) return;

    setLoading(true);
    setError("");
    rememberIntent();

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

      const identifier = contactMode === "phone" ? form.phone.trim() : form.email.trim();
      const next = safeReturnPath(searchParams);
      const start =
        selectedIntent.queryKey === "smartcard"
          ? smartCardStartPath(searchParams.get("plan"), searchParams.get("theme"))
          : null;
      const dest =
        next || start || selectedIntent.primaryHref || data.redirect || "/dashboard/getting-started";
      const result = await signIn("credentials", {
        identifier,
        password: form.password,
        redirect: false,
        callbackUrl: dest,
      });

      if (result?.error) {
        setError("Account created. Sign in with the same email or phone.");
        setLoading(false);
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(dest)}`);
        return;
      }

      window.location.assign(dest);
    } catch {
      setError(t("auth.something_wrong"));
      setLoading(false);
    }
  }

  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(
    safeReturnPath(searchParams) ||
      (selectedIntent?.queryKey === "smartcard"
        ? smartCardStartPath(searchParams.get("plan"), searchParams.get("theme"))
        : "/dashboard")
  )}`;

  const contactOk =
    contactMode === "email"
      ? form.email.trim().includes("@")
      : form.phone.trim().length >= 10;
  const canCreate =
    form.name.trim().length >= 2 &&
    form.password.length >= 8 &&
    contactOk &&
    Boolean(accountType) &&
    (accountType !== "ORGANIZATION" || form.organizationName.trim().length >= 2);

  return (
    <AuthLayout
      wide={step === 1}
      title={step === 1 ? t("auth.how_use") : t("auth.create_account")}
      subtitle={
        step === 1
          ? t("auth.how_use_body")
          : selectedIntent
            ? selectedIntent.next
            : t("auth.create_account_body")
      }
      panelTitle={t("auth.start_two_minutes")}
      panelBody={t("auth.start_body_signup")}
    >
      <SignupProgress
        current={step}
        total={2}
        labels={[t("auth.progress_intent"), t("auth.progress_account")]}
      />

      {step === 1 && (
        <div className="space-y-5">
          <OnboardingIntentGrid
            options={ONBOARDING_INTENT_OPTIONS}
            selected={selectedIntent}
            onSelect={selectIntent}
          />
          <p className="text-center text-sm text-slate-500">
            {t("auth.already_account")}{" "}
            <Link href={loginHref} className="text-brand-600 font-semibold hover:underline">
              {t("common.sign_in")}
            </Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Change how I will use Celeventic
          </button>

          {selectedIntent ? (
            <div className="rounded-xl bg-brand-50/70 border border-brand-100 p-3 text-sm">
              <p className="font-semibold text-slate-900">{selectedIntent.title}</p>
              <p className="text-slate-600 text-xs mt-0.5">{selectedIntent.next}</p>
            </div>
          ) : null}

          {error && (
            <div
              className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="name"
              placeholder="What should we call you?"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={contactMode === "email" ? "email" : "phone"}>
                {contactMode === "email" ? "Email" : "Phone"}
              </Label>
              <button
                type="button"
                className="text-xs font-semibold text-brand-700 hover:underline"
                onClick={() => {
                  setContactMode((m) => (m === "email" ? "phone" : "email"));
                  setError("");
                }}
              >
                {contactMode === "email" ? "Use phone instead" : "Use email instead"}
              </button>
            </div>
            {contactMode === "email" ? (
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
                placeholder="you@email.com"
              />
            ) : (
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+233..."
                autoComplete="tel"
                inputMode="tel"
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {form.password.length === 0
                ? "Use 8 or more characters."
                : form.password.length < 8
                  ? `${8 - form.password.length} more character${form.password.length === 7 ? "" : "s"} needed.`
                  : "Looks good."}
            </p>
          </div>

          {accountType === "ORGANIZATION" && (
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organisation name</Label>
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
              <Label htmlFor="vendorCategory">What do you offer?</Label>
              <select
                id="vendorCategory"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
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

          <div className="space-y-2">
            <CeleYouUsernameField
              value={form.username}
              onChange={(username) => setForm({ ...form, username })}
              displayName={form.name}
              company={form.organizationName}
            />
            <p className="text-xs text-slate-500">
              {selectedIntent?.queryKey === "smartcard"
                ? "Pick a unique username. Display names can match someone else. You can finish this on the next screen."
                : "Optional now. You can choose it later in account settings."}
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !canCreate}>
            {loading ? "Creating your account…" : "Create account"}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-500">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              rememberIntent();
              const next = safeReturnPath(searchParams);
              const start =
                selectedIntent?.queryKey === "smartcard"
                  ? smartCardStartPath(searchParams.get("plan"), searchParams.get("theme"))
                  : null;
              void signIn("google", {
                callbackUrl: resolveAuthCallbackUrl(
                  next || start || "/auth/onboarding/intent"
                ),
              });
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <p className="text-center text-xs text-slate-500 leading-relaxed">
            By creating an account you agree to our{" "}
            <Link href="/legal/terms" className="font-semibold text-brand-700 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="font-semibold text-brand-700 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-center text-sm text-slate-500">
            {t("auth.already_account")}{" "}
            <Link href={loginHref} className="text-brand-600 font-semibold hover:underline">
              {t("common.sign_in")}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Create your account" subtitle="Loading…">
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        </AuthLayout>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}
