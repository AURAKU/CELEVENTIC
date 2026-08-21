"use client";

import Link from "next/link";
import { LifeBuoy, Sparkles } from "lucide-react";

const FAQ = [
  {
    q: "How do I create my first event?",
    a: (
      <>
        Go to Events → Create Event, pick your event type, add details, and choose a package. Or open{" "}
        <Link href="/guide/create-an-event" className="text-brand-700 hover:underline">
          Create an event
        </Link>{" "}
        in Celeventic Guide.
      </>
    ),
  },
  {
    q: "How do I invite guests?",
    a: (
      <>
        Open your event, go to Guests, and add guests manually or import a CSV. Walkthrough:{" "}
        <Link href="/guide/add-guests" className="text-brand-700 hover:underline">
          Add guests
        </Link>
        .
      </>
    ),
  },
  {
    q: "I received an invitation — what do I do?",
    a: (
      <>
        Start with{" "}
        <Link href="/guide/welcome-to-celeventic" className="text-brand-700 hover:underline">
          Welcome to Celeventic
        </Link>
        , then RSVP and save your QR pass. Use Guest quick actions above if you are new.
      </>
    ),
  },
  {
    q: "How do I scan QR codes at my event?",
    a: (
      <>
        Open QR Admission from the dashboard, select your event, and scan passes. See{" "}
        <Link href="/guide/scan-guest" className="text-brand-700 hover:underline">
          Scan a guest
        </Link>
        .
      </>
    ),
  },
  {
    q: "Can I collaborate with my team?",
    a: "Yes. Open your event workspace to invite collaborators, assign tasks, and chat.",
  },
  {
    q: "Something is not working — where do I go?",
    a: (
      <>
        Search guides above, use <span className="font-medium text-slate-700">Ask Guide AI</span>, or
        WhatsApp / call{" "}
        <a href="tel:+233595968686" className="text-brand-700 hover:underline font-medium">
          0595968686
        </a>{" "}
        to speak with Customer Care. You can also email{" "}
        <a href="mailto:support@celeventic.com" className="text-brand-700 hover:underline">
          support@celeventic.com
        </a>
        .
      </>
    ),
  },
];

export function GuideFaqAccordion() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 sm:p-8 space-y-5" aria-label="Frequently asked questions">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-600" aria-hidden />
        <h2 className="font-display text-2xl font-semibold text-slate-900">Frequently asked questions</h2>
      </div>
      <div className="space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-xl border border-slate-100 p-4">
            <summary className="font-medium text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
              <span>{item.q}</span>
              <LifeBuoy className="h-4 w-4 shrink-0 text-slate-400 group-open:text-brand-600" aria-hidden />
            </summary>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
