"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingIntentGrid } from "@/components/auth/onboarding-intent-grid";
import {
  clearSignupIntent,
  findOnboardingIntent,
  intentFromQuery,
  ONBOARDING_INTENT_OPTIONS,
  readSignupIntent,
  VENDOR_SERVICE_CATEGORIES,
  type OnboardingIntentOption,
} from "@/lib/auth/onboarding-intents";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

/** Post-Google OAuth intent selection for users without accountType. */
export default function OnboardingIntentPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const [selected, setSelected] = useState<OnboardingIntentOption | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [vendorCategory, setVendorCategory] = useState<string>("Photographers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const appliedStored = useRef(false);

  async function saveIntent(option: OnboardingIntentOption, extras?: { organizationName?: string; vendorCategory?: string }) {
    if (option.id === "ORGANIZATION" && !(extras?.organizationName ?? organizationName).trim()) {
      setSelected(option);
      setError("Add your organisation name to continue.");
      setBooting(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: option.id,
          joinIntent: option.joinIntent,
          queryKey: option.queryKey,
          productIntent: option.queryKey === "smartcard" ? "celecard" : undefined,
          organizationName:
            option.id === "ORGANIZATION"
              ? (extras?.organizationName ?? organizationName).trim()
              : undefined,
          vendorCategory:
            option.id === "VENDOR" ? extras?.vendorCategory ?? vendorCategory : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not save your choice");
        setBooting(false);
        return;
      }
      clearSignupIntent();
      router.push(data.redirect ?? "/dashboard/getting-started");
      router.refresh();
    } catch {
      setError(t("auth.something_wrong"));
      setBooting(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/auth/onboarding");
      return;
    }
    const accountType = (session?.user as { accountType?: string | null } | undefined)?.accountType;
    const completed = (session?.user as { onboardingCompletedAt?: string | null } | undefined)
      ?.onboardingCompletedAt;
    if (accountType && completed) {
      router.replace("/dashboard");
      return;
    }
    if (accountType && !completed) {
      router.replace(
        accountType === "VENDOR" ? "/vendor/onboarding" : "/dashboard/getting-started"
      );
      return;
    }

    const stored = readSignupIntent();
    if (!stored) {
      setBooting(false);
      return;
    }
    const option =
      (stored.queryKey ? intentFromQuery(stored.queryKey) : undefined) ||
      findOnboardingIntent(stored.id, stored.joinIntent);
    if (!option) {
      setBooting(false);
      return;
    }
    setSelected(option);
    if (stored.organizationName) setOrganizationName(stored.organizationName);
    if (stored.vendorCategory) setVendorCategory(stored.vendorCategory);
    if (option.requiresConfirmFields && option.id === "ORGANIZATION" && !stored.organizationName) {
      setBooting(false);
      return;
    }
    if (appliedStored.current) return;
    appliedStored.current = true;
    void saveIntent(option, {
      organizationName: stored.organizationName,
      vendorCategory: stored.vendorCategory,
    });
  }, [status, session, router]);

  function handleSelect(option: OnboardingIntentOption) {
    setSelected(option);
    setError("");
    if (option.requiresConfirmFields) return;
    void saveIntent(option);
  }

  if (booting) {
    return (
      <AuthLayout
        title={t("auth.workspace_setup")}
        subtitle={t("auth.workspace_setup_body")}
      >
        <div className="space-y-3">
          <div className="h-4 rounded bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      wide
      title={t("auth.how_use")}
      subtitle={t("auth.google_done")}
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <OnboardingIntentGrid
          options={ONBOARDING_INTENT_OPTIONS}
          selected={selected}
          disabled={loading}
          onSelect={handleSelect}
        />

        {selected?.id === "ORGANIZATION" && (
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organisation name</Label>
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Grace Community Church"
              required
            />
          </div>
        )}

        {selected?.id === "VENDOR" && (
          <div className="space-y-2">
            <Label htmlFor="vendorCategory">What do you offer?</Label>
            <select
              id="vendorCategory"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={vendorCategory}
              onChange={(e) => setVendorCategory(e.target.value)}
            >
              {VENDOR_SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {selected?.requiresConfirmFields && (
          <Button
            className="w-full"
            size="lg"
            disabled={loading}
            onClick={() => selected && void saveIntent(selected)}
          >
            {loading ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {loading && !selected?.requiresConfirmFields && (
          <p className="text-center text-sm text-slate-500">Setting up your workspace…</p>
        )}
      </div>
    </AuthLayout>
  );
}
