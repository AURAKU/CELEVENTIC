"use client";

import { Compass } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

export function DiscoverHero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden bg-gradient-hero px-4 py-16 text-center text-white sm:py-20">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="relative mx-auto max-w-3xl">
        <div className="badge-pill mb-6 inline-flex items-center gap-2 border border-white/10 bg-white/10 text-gold-400">
          <Compass className="h-4 w-4" />
          {t("discover.badge")}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{t("discover.title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">{t("discover.subtitle")}</p>
      </div>
    </section>
  );
}

export function DiscoverFeaturedHeading() {
  const { t } = useLocale();

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">{t("discover.featured")}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">{t("discover.picked")}</h2>
    </div>
  );
}
