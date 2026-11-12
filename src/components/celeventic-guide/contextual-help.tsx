"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContextGuideTitles, resolveContextHelp } from "@/lib/celeventic-guide/context-map";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { TourEngine } from "./tour-engine";

function HelpMark({ className }: { className?: string }) {
  return (
    <svg viewBox="4.5 5.5 15 15" className={className} fill="none" aria-hidden>
      <path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17.15" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function ContextualHelpTrigger() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [tourId, setTourId] = useState<string | null>(null);
  const titleId = useId();
  const mapping = resolveContextHelp(pathname);
  const guides = getContextGuideTitles(pathname);

  useEffect(() => {
    setOpen(false);
    setTourId(null);
  }, [pathname]);

  if (!mapping || guides.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-[max(4.35rem,calc(env(safe-area-inset-bottom)+3.5rem))] right-[max(0.85rem,env(safe-area-inset-right))] z-40 transition-[bottom] duration-300 ease-out motion-reduce:transition-none [:root[data-mobile-dock=tucked]_&]:bottom-[max(1rem,env(safe-area-inset-bottom))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full p-0 shadow-[0_12px_28px_rgba(11,138,131,0.36)] ring-2 ring-white/90 hover:scale-[1.04] hover:shadow-[0_16px_32px_rgba(11,138,131,0.44)] motion-reduce:hover:scale-100"
          onClick={() => {
            setOpen(true);
            trackGuideEvent("guide_context_help", { path: pathname, mapping: mapping.routePrefix });
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Help"
          title="Help"
        >
          <HelpMark className="h-6 w-6" />
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close help"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">Celeventic Guide</p>
                <h2 id={titleId} className="font-display text-xl font-semibold text-slate-900 mt-1">
                  {mapping.label}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {mapping.intro ? (
              <p className="mb-4 text-sm leading-relaxed text-slate-600">{mapping.intro}</p>
            ) : null}
            {mapping.topics && mapping.topics.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {mapping.topics.map((topic) => (
                  <li key={topic.title} className="rounded-xl border border-slate-200 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{topic.body}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Guides</p>
            <ul className="space-y-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guide/${g.slug}`}
                    className="block rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800 hover:border-brand-300 hover:bg-brand-50/40"
                    onClick={() => setOpen(false)}
                  >
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {mapping.tourId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setTourId(mapping.tourId!);
                  }}
                >
                  Start walkthrough
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/legal/faq" onClick={() => setOpen(false)}>
                  Browse all guides
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {tourId && <TourEngine tourId={tourId} onClose={() => setTourId(null)} />}
    </>
  );
}
