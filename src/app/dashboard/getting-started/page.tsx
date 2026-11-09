"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrimaryAction } from "@/components/layout/primary-action";
import { trackUsability } from "@/lib/navigation/usability-analytics";
import { markPendingWelcomeTour } from "@/lib/celeventic-guide/tour-storage";
import { findOnboardingIntent } from "@/lib/auth/onboarding-intents";
import {
  ArrowRight,
  CalendarHeart,
  CheckCircle2,
  Compass,
  Mail,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import type { AccountType } from "@prisma/client";

const HOW_IT_WORKS = [
  {
    icon: CalendarHeart,
    title: "Create the event",
    body: "Date, venue, and who's hosting. This powers every invitation.",
  },
  {
    icon: Mail,
    title: "Send the invitation",
    body: "Pick a live template, share one link. Guests RSVP on their phone.",
  },
  {
    icon: Users,
    title: "Manage the list",
    body: "See who's coming, message them, and keep plus-ones tidy.",
  },
  {
    icon: QrCode,
    title: "Admit on the day",
    body: "Each guest gets a QR. Scan at the door, even offline.",
  },
];

function extractInvitePath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = value.includes("://") ? new URL(value) : new URL(value, "https://celeventic.com");
    const invite = url.pathname.match(/\/invite\/([^/?#]+)/);
    if (invite?.[1]) return `/invite/${invite[1]}`;
  } catch {
    /* fall through */
  }
  if (/^[a-zA-Z0-9_-]{8,}$/.test(value)) return `/invite/${value}`;
  return null;
}

function GettingStartedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const [completing, setCompleting] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");

  const intentParam = searchParams.get("intent");
  const accountType = (session?.user as { accountType?: AccountType })?.accountType;
  const joinIntent = intentParam === "join" || intentParam === "guest";
  const option = findOnboardingIntent(accountType ?? "EVENT_OWNER", joinIntent);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const isVendor = accountType === "VENDOR";
  const isGuest = joinIntent;

  const primaryHref = useMemo(() => {
    if (isVendor) return "/vendor/onboarding";
    if (isGuest) return "/dashboard/invitations/workspace";
    return option?.primaryHref ?? "/dashboard/events/create";
  }, [isVendor, isGuest, option]);

  const primaryCta = isVendor
    ? "Set up my vendor profile"
    : isGuest
      ? "Open workspace invites"
      : option?.primaryCta ?? "Create my first event";

  async function finishAndGo(href: string, opts: { skipped?: boolean; tour?: boolean } = {}) {
    setCompleting(true);
    trackUsability(opts.skipped ? "onboarding_skipped" : "onboarding_completed", {
      startTour: opts.tour ? 1 : 0,
    });
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: accountType ?? "EVENT_OWNER",
          skipped: Boolean(opts.skipped),
        }),
      });
      try {
        await updateSession();
      } catch {
        /* JWT refresh is best-effort; first-run routes are already allowlisted. */
      }
      if (opts.tour) markPendingWelcomeTour();
      router.push(href);
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  function openInvite() {
    const path = extractInvitePath(inviteInput);
    if (!path) {
      setInviteError("Paste the full invitation link you were sent, or just the code at the end.");
      return;
    }
    setInviteError("");
    void finishAndGo(path);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div className="text-center space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          You are in
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-900">
          Welcome, {firstName}
        </h1>
        <p className="text-slate-700 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {option?.next ??
            "Your account is ready. Take one step below. We'll keep the rest of Celeventic out of the way until you need it."}
        </p>
        {option ? (
          <p className="inline-flex items-center rounded-full bg-brand-50 text-brand-800 text-xs font-semibold px-3 py-1">
            {option.title}
          </p>
        ) : null}
      </div>

      {isGuest ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Find the invitation you were sent</h2>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              Paste the link from WhatsApp, SMS, or email. We will open it and you can RSVP.
            </p>
          </div>
          <div className="action-row">
            <Input
              value={inviteInput}
              onChange={(e) => {
                setInviteInput(e.target.value);
                setInviteError("");
              }}
              placeholder="https://celeventic.com/invite/…"
              aria-label="Invitation link"
            />
            <Button onClick={openInvite} disabled={completing} className="shrink-0">
              Open invitation
            </Button>
          </div>
          {inviteError ? <p className="text-sm text-red-600">{inviteError}</p> : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-brand-100 bg-white p-5 sm:p-7 shadow-[0_12px_40px_rgba(11,138,131,0.08)] space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Your next step</h2>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            {isGuest
              ? "If a planner invited you to help, open workspace invites. If you're only attending, paste the guest link above."
              : isVendor
                ? "Hosts find you from your marketplace profile. We'll ask for your business, services, and photos."
                : "Create the event first. Then pick a template and share one link with guests."}
          </p>
        </div>
        <div className="action-row">
          <PrimaryAction
            onClick={() => void finishAndGo(primaryHref, { tour: false })}
            disabled={completing}
            className="min-h-12"
          >
            {completing ? "Opening…" : primaryCta}
            <ArrowRight className="h-4 w-4" />
          </PrimaryAction>
          {!isVendor && !isGuest ? (
            <Button
              variant="outline"
              disabled={completing}
              className="min-h-12"
              onClick={() => void finishAndGo("/invitations/catalogue")}
            >
              Start from an invitation template
            </Button>
          ) : null}
        </div>
      </div>

      {!isGuest ? (
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
            How Celeventic works
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand-600" />
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-semibold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-600" />
          Finding your way around
        </p>
        <p>
          After this screen, the left menu (or the bar at the bottom on a phone) is home. Look for
          Events, Invitations, Guests, and Messages. Search is at the top. You can come back to Help
          anytime.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => void finishAndGo("/dashboard", { skipped: true, tour: false })}
          disabled={completing}
          className="min-h-11 text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
        >
          I will explore on my own
        </button>
        <Button
          variant="ghost"
          disabled={completing}
          onClick={() => void finishAndGo("/dashboard?tour=welcome", { tour: true })}
        >
          <Compass className="h-4 w-4" />
          Finish & take a 30-second tour
        </Button>
        <Link
          href="/legal/faq"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 text-brand-700 font-semibold hover:underline"
        >
          <Sparkles className="h-4 w-4" />
          Need help?
        </Link>
      </div>
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto py-16 text-center text-sm text-slate-500">
          Preparing your first step…
        </div>
      }
    >
      <GettingStartedContent />
    </Suspense>
  );
}
