"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrimaryAction } from "@/components/layout/primary-action";
import { trackUsability } from "@/lib/navigation/usability-analytics";
import {
  CalendarHeart,
  Briefcase,
  Building2,
  UserPlus,
  Store,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { AccountType } from "@prisma/client";

type FlowId = AccountType | "JOIN";

interface StepDef {
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FLOWS: Record<FlowId, StepDef[]> = {
  EVENT_OWNER: [
    { title: "Choose your event type", description: "Wedding, funeral, conference, and more.", href: "/dashboard/events/create", cta: "Create Event" },
    { title: "Add event details", description: "Date, venue, and host information.", href: "/dashboard/events/create", cta: "Add Details" },
    { title: "Choose your package", description: "Pick the plan that fits your celebration.", href: "/dashboard/events/create", cta: "View Packages" },
    { title: "Invite collaborators", description: "Bring your team on board.", href: "/dashboard/invitations/workspace", cta: "Invite Team" },
    { title: "Start planning", description: "Guests, invitations, vendors — you're ready.", href: "/dashboard", cta: "Go to Dashboard" },
  ],
  ORGANIZER: [
    { title: "Complete your organizer profile", description: "Help clients find and trust you.", href: "/dashboard/settings", cta: "Edit Profile" },
    { title: "Create or join an event", description: "Start a new project or accept an invite.", href: "/dashboard/events/create", cta: "Create Event" },
    { title: "Invite a client", description: "Share access with your client.", href: "/dashboard/invitations/workspace", cta: "Send Invite" },
    { title: "Add collaborators", description: "Build your planning team.", href: "/dashboard/invitations/workspace", cta: "Add Collaborators" },
    { title: "Start managing", description: "Tasks, guests, and vendors await.", href: "/dashboard", cta: "Open Dashboard" },
  ],
  ORGANIZATION: [
    { title: "Set up your organization", description: "Team name, branding, and settings.", href: "/dashboard/settings?tab=organization", cta: "Organization Settings" },
    { title: "Create your first event", description: "Launch an event for your group.", href: "/dashboard/events/create", cta: "Create Event" },
    { title: "Invite your team", description: "Add members with the right permissions.", href: "/dashboard/settings?tab=team", cta: "Invite Team" },
    { title: "Configure permissions", description: "Control who can do what.", href: "/dashboard/settings?tab=permissions", cta: "Set Permissions" },
    { title: "Start managing events", description: "Your organization workspace is ready.", href: "/dashboard", cta: "Go to Dashboard" },
  ],
  VENDOR: [
    { title: "Add business details", description: "Name, location, and contact info.", href: "/vendor/onboarding", cta: "Continue Setup" },
    { title: "Add services", description: "What you offer and your pricing.", href: "/vendor/onboarding", cta: "Add Services" },
    { title: "Upload portfolio", description: "Show your best work.", href: "/vendor/onboarding", cta: "Upload Photos" },
    { title: "Set availability", description: "When you're open for bookings.", href: "/vendor/onboarding", cta: "Set Schedule" },
    { title: "Publish profile", description: "Go live on the marketplace.", href: "/vendor/onboarding", cta: "Publish" },
  ],
  JOIN: [
    { title: "Check your invitations", description: "Open pending workspace invites.", href: "/dashboard/invitations/workspace", cta: "View Invitations" },
    { title: "Accept an invite", description: "Join the event team.", href: "/dashboard/invitations/workspace", cta: "Accept Invite" },
    { title: "Explore the event", description: "See guests, tasks, and timeline.", href: "/dashboard/events", cta: "View Events" },
    { title: "Say hello to the team", description: "Send a message to collaborators.", href: "/dashboard/messages", cta: "Open Messages" },
    { title: "You're all set", description: "Start contributing to the event.", href: "/dashboard", cta: "Go to Dashboard" },
  ],
};

const FLOW_ICONS: Record<FlowId, typeof CalendarHeart> = {
  EVENT_OWNER: CalendarHeart,
  ORGANIZER: Briefcase,
  ORGANIZATION: Building2,
  VENDOR: Store,
  JOIN: UserPlus,
};

export default function GettingStartedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const intent = searchParams.get("intent");
  const accountType = (session?.user as { accountType?: AccountType })?.accountType;
  const flowKey: FlowId =
    intent === "join"
      ? "JOIN"
      : accountType === "VENDOR"
        ? "VENDOR"
        : (accountType ?? "EVENT_OWNER");

  const steps = FLOWS[flowKey];
  const FlowIcon = FLOW_ICONS[flowKey];
  const progress = Math.round(((step + 1) / steps.length) * 100);

  async function finish(skipped = false) {
    setCompleting(true);
    trackUsability(skipped ? "onboarding_skipped" : "onboarding_completed", { step });
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: flowKey === "JOIN" ? "EVENT_OWNER" : accountType, skipped }),
      });
      const data = await res.json();
      if (flowKey === "VENDOR") {
        router.push("/vendor/onboarding");
      } else {
        router.push(data.redirect ?? "/dashboard");
      }
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  const current = steps[step];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-50 text-brand-600">
          <FlowIcon className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Welcome to Celeventic
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          A quick guide to get you started — about {steps.length} steps.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="border-brand-100 shadow-lg">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
              {step + 1}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">{current.title}</h2>
              <p className="text-slate-500 mt-1">{current.description}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryAction asChild>
              <Link href={current.href}>
                {current.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </PrimaryAction>
            {step < steps.length - 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s + 1)}>
                Next Step
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void finish(false)} disabled={completing}>
                <CheckCircle2 className="h-4 w-4" />
                {completing ? "Finishing..." : "Finish Setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <button
          type="button"
          onClick={() => void finish(true)}
          disabled={completing}
          className="text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
        >
          Skip for now
        </button>
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
        >
          <Sparkles className="h-4 w-4" />
          Need help?
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-colors ${
              i <= step ? "bg-brand-500" : "bg-slate-200"
            }`}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
}
