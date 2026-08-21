"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_INTENT_OPTIONS,
  VENDOR_SERVICE_CATEGORIES,
  type OnboardingIntentOption,
} from "@/lib/auth/onboarding-intents";
import { ArrowRight, Check } from "lucide-react";

/** Post-Google OAuth intent selection for users without accountType. */
export default function OnboardingIntentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<OnboardingIntentOption | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [vendorCategory, setVendorCategory] = useState<string>("Photographers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function saveIntent(option: OnboardingIntentOption) {
    if (option.id === "ORGANIZATION" && !organizationName.trim()) {
      setSelected(option);
      setError("Add your organization name to continue.");
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
          organizationName:
            option.id === "ORGANIZATION" ? organizationName.trim() : undefined,
          vendorCategory: option.id === "VENDOR" ? vendorCategory : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not save your choice");
        return;
      }
      router.push(data.redirect ?? "/dashboard/getting-started");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(option: OnboardingIntentOption) {
    setSelected(option);
    setError("");
    // Paths that need extra fields stay on this screen; others continue immediately.
    if (option.requiresConfirmFields) return;
    void saveIntent(option);
  }

  return (
    <AuthLayout
      title="What would you like to do on Celeventic?"
      subtitle="Choose one option to personalize your workspace."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {ONBOARDING_INTENT_OPTIONS.map((type) => {
            const Icon = type.icon;
            const isSelected =
              selected?.id === type.id && selected.joinIntent === type.joinIntent;
            return (
              <button
                key={`${type.id}-${type.joinIntent}`}
                type="button"
                disabled={loading}
                onClick={() => handleSelect(type)}
                className={`text-left p-5 rounded-2xl border-2 transition-all touch-manipulation min-h-[120px] disabled:opacity-60 ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 shadow-md"
                    : "border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-brand-600" />}
                </div>
                <h3 className="font-semibold mt-3">{type.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{type.description}</p>
              </button>
            );
          })}
        </div>

        {selected?.id === "ORGANIZATION" && (
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
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
            <Label htmlFor="vendorCategory">Primary service category</Label>
            <select
              id="vendorCategory"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            {loading ? "Saving..." : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {loading && !selected?.requiresConfirmFields && (
          <p className="text-center text-sm text-slate-500">Setting up your workspace…</p>
        )}
      </div>
    </AuthLayout>
  );
}
