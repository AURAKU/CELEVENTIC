"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrimaryAction } from "@/components/layout/primary-action";
import { trackUsability } from "@/lib/navigation/usability-analytics";
import { markPendingWelcomeTour } from "@/lib/celeventic-guide/tour-storage";
import {
  CalendarHeart,
  Briefcase,
  Building2,
  UserPlus,
  Store,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Compass,
  Lightbulb,
} from "lucide-react";
import type { AccountType } from "@prisma/client";

type FlowId = AccountType | "JOIN";

interface StepDef {
  title: string;
  description: string;
  why: string;
  href: string;
  cta: string;
}

const FLOWS: Record<FlowId, StepDef[]> = {
  EVENT_OWNER: [
    {
      title: "Choose your event type",
      description: "Wedding, birthday, funeral, conference — pick what you're planning.",
      why: "This unlocks the right templates, guest tools, and packages.",
      href: "/dashboard/events/create",
      cta: "Create Event",
    },
    {
      title: "Add the basics",
      description: "Date, venue, and host details so guests know where to be.",
      why: "Your invitation and RSVP flow use these details automatically.",
      href: "/dashboard/events/create",
      cta: "Add Details",
    },
    {
      title: "Choose your package",
      description: "Pick the plan that matches your guest list and features.",
      why: "Packages control guest limits, messaging, and premium tools.",
      href: "/dashboard/events/create",
      cta: "View Packages",
    },
    {
      title: "Invite your team",
      description: "Bring planners or family into the same event workspace.",
      why: "Collaborators share one guest list, timeline, and invitation studio.",
      href: "/dashboard/invitations/workspace",
      cta: "Invite Team",
    },
    {
      title: "You're ready to plan",
      description: "Finish setup and we'll show you around the dashboard — search, create, alerts, and more.",
      why: "A 30-second tour means you won't need to ask anyone how Celeventic works.",
      href: "/dashboard",
      cta: "Preview Dashboard",
    },
  ],
  ORGANIZER: [
    {
      title: "Complete your organizer profile",
      description: "Help clients find and trust you.",
      why: "A clear profile makes it easier to win and manage client events.",
      href: "/dashboard/settings",
      cta: "Edit Profile",
    },
    {
      title: "Create or join an event",
      description: "Start a new project or accept a client invite.",
      why: "Every client celebration lives as an event workspace.",
      href: "/dashboard/events/create",
      cta: "Create Event",
    },
    {
      title: "Invite a client",
      description: "Share access so your client can follow progress.",
      why: "Clients stay informed without living in your inbox.",
      href: "/dashboard/invitations/workspace",
      cta: "Send Invite",
    },
    {
      title: "Add collaborators",
      description: "Build your planning team for the event.",
      why: "Vendors and assistants work from the same source of truth.",
      href: "/dashboard/invitations/workspace",
      cta: "Add Collaborators",
    },
    {
      title: "Start managing",
      description: "Finish setup and take a quick tour of how navigation works.",
      why: "You'll know where Create, Search, and Alerts live before you need them.",
      href: "/dashboard",
      cta: "Open Dashboard",
    },
  ],
  ORGANIZATION: [
    {
      title: "Set up your organization",
      description: "Team name, branding, and shared settings.",
      why: "Your org workspace keeps every group event in one place.",
      href: "/dashboard/settings?tab=organization",
      cta: "Organization Settings",
    },
    {
      title: "Create your first event",
      description: "Launch an event for your company, church, school, or community.",
      why: "Events inherit your org members and permissions.",
      href: "/dashboard/events/create",
      cta: "Create Event",
    },
    {
      title: "Invite your team",
      description: "Add members with the right access levels.",
      why: "Everyone sees only what they need — no shared passwords.",
      href: "/dashboard/settings?tab=team",
      cta: "Invite Team",
    },
    {
      title: "Configure permissions",
      description: "Control who can edit guests, invitations, and finances.",
      why: "Safe collaboration for large teams.",
      href: "/dashboard/settings?tab=permissions",
      cta: "Set Permissions",
    },
    {
      title: "Start managing events",
      description: "Your organization workspace is ready — finish and take a guided tour.",
      why: "We'll highlight Search, Create, Alerts, and navigation so your team is self-sufficient.",
      href: "/dashboard",
      cta: "Go to Dashboard",
    },
  ],
  VENDOR: [
    {
      title: "Add business details",
      description: "Name, location, and contact info.",
      why: "Hosts find you in the marketplace from this profile.",
      href: "/vendor/onboarding",
      cta: "Continue Setup",
    },
    {
      title: "Add services",
      description: "What you offer and your pricing.",
      why: "Clear packages convert more booking requests.",
      href: "/vendor/onboarding",
      cta: "Add Services",
    },
    {
      title: "Upload portfolio",
      description: "Show your best work.",
      why: "Photos build trust before the first message.",
      href: "/vendor/onboarding",
      cta: "Upload Photos",
    },
    {
      title: "Set availability",
      description: "When you're open for bookings.",
      why: "Hosts only request dates you can take.",
      href: "/vendor/onboarding",
      cta: "Set Schedule",
    },
    {
      title: "Publish profile",
      description: "Go live on the marketplace.",
      why: "Publishing makes you discoverable to event hosts.",
      href: "/vendor/onboarding",
      cta: "Publish",
    },
  ],
  JOIN: [
    {
      title: "Check your invitations",
      description: "Open pending workspace invites.",
      why: "Invites are how you join someone else's event team.",
      href: "/dashboard/invitations/workspace",
      cta: "View Invitations",
    },
    {
      title: "Accept an invite",
      description: "Join the event team with one tap.",
      why: "Acceptance unlocks guests, tasks, and messages for that event.",
      href: "/dashboard/invitations/workspace",
      cta: "Accept Invite",
    },
    {
      title: "Explore the event",
      description: "See guests, tasks, and timeline.",
      why: "You'll know what's already planned before you start helping.",
      href: "/dashboard/events",
      cta: "View Events",
    },
    {
      title: "Say hello to the team",
      description: "Send a message to collaborators.",
      why: "In-app chat keeps decisions with the event — not lost in WhatsApp.",
      href: "/dashboard/messages",
      cta: "Open Messages",
    },
    {
      title: "You're all set",
      description: "Finish setup and learn where Home, Events, and Alerts live.",
      why: "A short tour means you can contribute without waiting for a walkthrough call.",
      href: "/dashboard",
      cta: "Go to Dashboard",
    },
  ],
};

const FLOW_ICONS: Record<FlowId, typeof CalendarHeart> = {
  EVENT_OWNER: CalendarHeart,
  ORGANIZER: Briefcase,
  ORGANIZATION: Building2,
  VENDOR: Store,
  JOIN: UserPlus,
};

const FLOW_LABELS: Record<FlowId, string> = {
  EVENT_OWNER: "Planning your own event",
  ORGANIZER: "Planning for clients",
  ORGANIZATION: "Organization workspace",
  VENDOR: "Vendor marketplace",
  JOIN: "Joining an event team",
};

function GettingStartedContent() {
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
  const isLast = step >= steps.length - 1;
  const current = steps[step];

  async function finish(opts: { skipped?: boolean; startTour?: boolean } = {}) {
    const { skipped = false, startTour = !skipped && flowKey !== "VENDOR" } = opts;
    setCompleting(true);
    trackUsability(skipped ? "onboarding_skipped" : "onboarding_completed", {
      step,
      startTour: startTour ? 1 : 0,
    });
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: flowKey === "JOIN" ? "EVENT_OWNER" : accountType,
          skipped,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { redirect?: string };

      if (flowKey === "VENDOR") {
        router.push("/vendor/onboarding");
      } else if (startTour) {
        markPendingWelcomeTour();
        router.push("/dashboard?tour=welcome");
      } else {
        router.push(data.redirect ?? "/dashboard");
      }
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-50 text-brand-600">
          <FlowIcon className="h-8 w-8" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
          {FLOW_LABELS[flowKey]}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Welcome to Celeventic
        </h1>
        <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
          {steps.length} clear steps — then a short tour so you can use the platform on your own.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="border-brand-100 shadow-lg overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
              {step + 1}
            </div>
            <div className="min-w-0 space-y-2">
              <h2 className="font-display text-xl font-bold text-slate-900">{current.title}</h2>
              <p className="text-slate-600">{current.description}</p>
              <div className="flex gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600">
                <Lightbulb className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold text-slate-800">Why this matters: </span>
                  {current.why}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!isLast ? (
              <>
                <PrimaryAction asChild>
                  <Link href={current.href}>
                    {current.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </PrimaryAction>
                <Button variant="outline" onClick={() => setStep((s) => s + 1)}>
                  Next Step
                </Button>
              </>
            ) : (
              <>
                <PrimaryAction
                  onClick={() => void finish({ startTour: flowKey !== "VENDOR" })}
                  disabled={completing}
                >
                  <Compass className="h-4 w-4" />
                  {completing ? "Starting…" : "Finish & take a quick tour"}
                </PrimaryAction>
                <Button variant="outline" asChild>
                  <Link href={current.href}>
                    {current.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          {isLast && flowKey !== "VENDOR" && (
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
              The tour highlights Search, Create, Notifications, your profile, and how to move around —
              about 30 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <button
          type="button"
          onClick={() => void finish({ skipped: true, startTour: false })}
          disabled={completing}
          className="text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
        >
          Skip for now
        </button>
        <Link
          href="/legal/faq"
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

export default function GettingStartedPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-16 text-center text-sm text-slate-500">
          Preparing your guide…
        </div>
      }
    >
      <GettingStartedContent />
    </Suspense>
  );
}
