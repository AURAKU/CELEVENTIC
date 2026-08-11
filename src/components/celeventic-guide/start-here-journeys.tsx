"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { START_HERE_JOURNEYS, journeysForPreferredRole } from "@/lib/celeventic-guide/journeys";
import { GUIDE_ROLE_LABELS } from "@/lib/celeventic-guide/types";
import type { GuideRole } from "@/lib/celeventic-guide/types";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { cn } from "@/lib/utils";

export function StartHereJourneys({
  preferredRole,
  className,
}: {
  preferredRole?: GuideRole | null;
  className?: string;
}) {
  const journeys = journeysForPreferredRole(preferredRole);

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="start-here-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="start-here-heading" className="font-display text-2xl font-semibold text-slate-900">
            Start Here
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pick your role for a short learning path — Guest, Organizer, Vendor, or Scanner.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {journeys.map((journey) => {
          const first = journey.slugs[0] ?? "how-celeventic-works";
          return (
            <Link
              key={journey.id}
              href={`/guide/${first}?journey=${journey.id}`}
              onClick={() => trackGuideEvent("guide_journey_start", { journey: journey.id, role: journey.role })}
              className={cn(
                "group rounded-2xl border border-slate-200/90 bg-white/85 p-4 transition",
                "hover:border-brand-300 hover:shadow-[0_10px_28px_rgba(11,138,131,0.1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                preferredRole === journey.role && "border-brand-400 ring-1 ring-brand-200"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                {GUIDE_ROLE_LABELS[journey.role]}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                {journey.title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{journey.summary}</p>
              <p className="mt-3 inline-flex items-center text-sm font-semibold text-brand-800">
                Begin <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </p>
              <ol className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {journey.slugs.slice(0, 4).map((slug, i) => (
                  <li key={slug} className="text-xs text-slate-400 truncate">
                    {i + 1}. {slug.replace(/-/g, " ")}
                  </li>
                ))}
                {journey.slugs.length > 4 ? (
                  <li className="text-xs text-slate-400">+{journey.slugs.length - 4} more</li>
                ) : null}
              </ol>
            </Link>
          );
        })}
      </div>

      {START_HERE_JOURNEYS.length === 0 ? null : (
        <p className="text-xs text-slate-400">
          Prefer browsing? Use search and filters below — or open{" "}
          <Link href="/guide/how-celeventic-works" className="text-brand-700 hover:underline">
            How Celeventic Works
          </Link>
          .
        </p>
      )}
    </section>
  );
}
