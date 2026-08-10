"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GuidePlayer } from "@/components/celeventic-guide/guide-player";
import { MotionWalkthrough } from "@/components/celeventic-guide/motion-walkthrough";
import { StepCards } from "@/components/celeventic-guide/step-cards";
import { GuideShareBar } from "@/components/celeventic-guide/guide-share-bar";
import { GuideFeedback } from "@/components/celeventic-guide/guide-feedback";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { GUIDE_CATEGORY_LABELS, GUIDE_ROLE_LABELS } from "@/lib/celeventic-guide/types";
import type { GuideCategory, GuideRole } from "@/lib/celeventic-guide/types";
import type { GuideStoryboard } from "@/lib/celeventic-guide/storyboards";

export interface TutorialViewModel {
  slug: string;
  title: string;
  summary: string;
  body: string;
  role: string;
  category: string;
  posterUrl: string | null;
  videoUrl: string | null;
  captionsEnUrl: string | null;
  transcript: string;
  storyboard: GuideStoryboard | null;
  steps: Array<{ id: string; sortOrder: number; title: string; body: string; stepType: string }>;
  related: Array<{ slug: string; title: string; summary: string }>;
}

export function TutorialClient({ guide }: { guide: TutorialViewModel }) {
  useEffect(() => {
    trackGuideEvent("guide_viewed", { slug: guide.slug });
  }, [guide.slug]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <nav className="text-sm text-slate-500 mb-6">
        <Link href="/guide" className="hover:text-brand-700">
          Celeventic Guide
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{guide.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 items-start">
        <div className="space-y-5 lg:sticky lg:top-24">
          {guide.storyboard ? (
            <MotionWalkthrough storyboard={guide.storyboard} slug={guide.slug} />
          ) : null}
          <GuidePlayer
            slug={guide.slug}
            title={guide.title}
            videoUrl={guide.videoUrl}
            posterUrl={guide.posterUrl}
            captionsUrl={guide.captionsEnUrl}
            transcript={guide.transcript}
          />
        </div>

        <div className="space-y-8">
          <header className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
              <span className="rounded-md bg-brand-50 text-brand-800 px-2 py-1">
                {GUIDE_ROLE_LABELS[guide.role as GuideRole] ?? guide.role}
              </span>
              <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-1">
                {GUIDE_CATEGORY_LABELS[guide.category as GuideCategory] ?? guide.category}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
              {guide.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">{guide.summary}</p>
            <GuideShareBar slug={guide.slug} title={guide.title} />
          </header>

          {guide.body ? <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{guide.body}</p> : null}

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-slate-900">Steps</h2>
            <StepCards steps={guide.steps} />
          </section>

          <GuideFeedback slug={guide.slug} />

          {guide.related.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-slate-900">Related guides</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {guide.related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/guide/${r.slug}`}
                      className="block rounded-2xl border border-slate-200 bg-white/80 p-4 hover:border-brand-300 transition"
                    >
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-sm text-slate-500">
            Still need help?{" "}
            <Link href="/legal/contact" className="text-brand-700 hover:underline">
              Contact support
            </Link>{" "}
            or email{" "}
            <a href="mailto:support@celeventic.com" className="text-brand-700 hover:underline">
              support@celeventic.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
