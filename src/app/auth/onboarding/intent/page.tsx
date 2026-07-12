"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  CalendarHeart,
  Store,
  UserPlus,
  Check,
  ArrowRight,
} from "lucide-react";
import type { AccountType } from "@prisma/client";

const INTENT_OPTIONS = [
  { id: "EVENT_OWNER" as AccountType, title: "Plan My Own Event", description: "I'm planning my own celebration.", icon: CalendarHeart, joinIntent: false },
  { id: "ORGANIZER" as AccountType, title: "Plan Events for Clients", description: "I professionally manage events.", icon: Briefcase, joinIntent: false },
  { id: "VENDOR" as AccountType, title: "Offer Event Services", description: "I provide event services.", icon: Store, joinIntent: false },
  { id: "ORGANIZATION" as AccountType, title: "Manage Events for an Organization", description: "My company organizes events.", icon: Building2, joinIntent: false },
  { id: "EVENT_OWNER" as AccountType, title: "Join an Existing Event", description: "I was invited to collaborate.", icon: UserPlus, joinIntent: true },
];

/** Post-Google OAuth intent selection for users without accountType. */
export default function OnboardingIntentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof INTENT_OPTIONS)[number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: selected.id,
          joinIntent: selected.joinIntent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your choice");
        return;
      }
      router.push(data.redirect ?? "/dashboard/getting-started");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="What would you like to do on Celeventic?"
      subtitle="Choose one option to personalize your workspace."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {INTENT_OPTIONS.map((type) => {
            const Icon = type.icon;
            const isSelected = selected?.id === type.id && selected.joinIntent === type.joinIntent;
            return (
              <button
                key={`${type.id}-${type.joinIntent}`}
                type="button"
                onClick={() => setSelected(type)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected ? "border-brand-500 bg-brand-50 shadow-md" : "border-slate-200 hover:border-brand-300"
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
        <Button className="w-full" size="lg" disabled={!selected || loading} onClick={() => void handleContinue()}>
          {loading ? "Saving..." : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-center text-sm text-slate-500">
          <Link href="/dashboard" className="text-brand-600 hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
