"use client";

import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, ShieldCheck, Star, Store, Users } from "lucide-react";

export type MarketplaceTrustKind = "verified" | "reviews" | "safety";

export interface MarketplaceTrustItem {
  kind: MarketplaceTrustKind;
  title: string;
  body: string;
}

interface MarketplaceMatchBoardProps {
  kicker: string;
  title: string;
  body: string;
  hostTitle: string;
  hostBody: string;
  vendorTitle: string;
  vendorBody: string;
  connectLabel: string;
  chips: string[];
  trust: MarketplaceTrustItem[];
  findLabel: string;
  verifiedFindLabel: string;
  listLabel: string;
  listHref: string;
  onFind: () => void;
  onFindVerified: () => void;
}

const TRUST_ICONS = {
  verified: BadgeCheck,
  reviews: Star,
  safety: ShieldCheck,
} as const;

export function MarketplaceMatchBoard({
  kicker,
  title,
  body,
  hostTitle,
  hostBody,
  vendorTitle,
  vendorBody,
  connectLabel,
  chips,
  trust,
  findLabel,
  verifiedFindLabel,
  listLabel,
  listHref,
  onFind,
  onFindVerified,
}: MarketplaceMatchBoardProps) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
      <div className="relative px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-gold-400/20 blur-3xl" />

        <p className="relative text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-200">
          {kicker}
        </p>
        <h2 className="relative mt-2 max-w-2xl font-display text-2xl font-bold leading-tight tracking-tight [overflow-wrap:normal] [word-break:normal] sm:text-3xl">
          {title}
        </h2>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
          {body}
        </p>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <article className="rounded-[1.25rem] border border-white/12 bg-white/5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 ring-2 ring-white/20">
                <Users className="h-5 w-5 text-white" strokeWidth={1.8} />
              </span>
              <p className="font-display text-lg font-bold">{hostTitle}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/72">{hostBody}</p>
          </article>

          <div className="flex items-center justify-center py-1 sm:px-1">
            <div className="flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/15 px-3 py-1.5 text-gold-300">
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">{connectLabel}</span>
            </div>
          </div>

          <article className="rounded-[1.25rem] border border-white/12 bg-white/5 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-accent-500 ring-2 ring-white/20">
                <Store className="h-5 w-5 text-slate-950" strokeWidth={1.8} />
              </span>
              <p className="font-display text-lg font-bold">{vendorTitle}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/72">{vendorBody}</p>
          </article>
        </div>

        <ul className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {trust.map((item) => {
            const Icon = TRUST_ICONS[item.kind];
            return (
              <li
                key={item.kind}
                className="rounded-[1.15rem] border border-white/12 bg-slate-950/50 p-4"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {item.title}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
              </li>
            );
          })}
        </ul>

        <ul className="relative mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-semibold text-white/85"
            >
              {chip}
            </li>
          ))}
        </ul>

        <div className="relative mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onFind}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-slate-950 touch-manipulation"
          >
            {findLabel}
          </button>
          <button
            type="button"
            onClick={onFindVerified}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-6 font-semibold text-emerald-200 touch-manipulation"
          >
            <BadgeCheck className="h-4 w-4" aria-hidden />
            {verifiedFindLabel}
          </button>
          <Link
            href={listHref}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-6 font-semibold text-white touch-manipulation"
          >
            {listLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
