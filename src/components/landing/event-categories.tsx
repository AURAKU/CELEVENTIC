"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Cake,
  Church,
  Flower2,
  GraduationCap,
  Heart,
  Music,
  PartyPopper,
  Presentation,
  Rocket,
  Sparkles,
  Tent,
} from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";
import { catalogBrowseHref, eventPlanHref } from "@/lib/invitation/catalog-event-type";
import { useLocale } from "@/components/i18n/locale-provider";

const EVENT_TYPE_KEYS: Record<string, string> = {
  WEDDING: "events.type_wedding",
  FUNERAL: "events.type_funeral",
  BIRTHDAY: "events.type_birthday",
  CONFERENCE: "events.type_conference",
  CHURCH_PROGRAM: "events.type_church",
  CORPORATE_EVENT: "events.type_corporate",
  CONCERT: "events.type_concert",
  FESTIVAL: "events.type_festival",
  SCHOOL_EVENT: "events.type_school",
  PRODUCT_LAUNCH: "events.type_launch",
  PRIVATE_EVENT: "events.type_private",
  CUSTOM: "events.type_custom",
};

const PURPOSE_KEYS: Record<string, string> = {
  WEDDING: "landing.cat_purpose_wedding",
  FUNERAL: "landing.cat_purpose_funeral",
  BIRTHDAY: "landing.cat_purpose_birthday",
  CONFERENCE: "landing.cat_purpose_conference",
  CHURCH_PROGRAM: "landing.cat_purpose_church",
  CORPORATE_EVENT: "landing.cat_purpose_corporate",
  CONCERT: "landing.cat_purpose_concert",
  FESTIVAL: "landing.cat_purpose_festival",
  SCHOOL_EVENT: "landing.cat_purpose_school",
  PRODUCT_LAUNCH: "landing.cat_purpose_launch",
  PRIVATE_EVENT: "landing.cat_purpose_private",
  CUSTOM: "landing.cat_purpose_custom",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  WEDDING: Heart,
  FUNERAL: Flower2,
  BIRTHDAY: Cake,
  CONFERENCE: Presentation,
  CHURCH_PROGRAM: Church,
  CORPORATE_EVENT: Building2,
  CONCERT: Music,
  FESTIVAL: Tent,
  SCHOOL_EVENT: GraduationCap,
  PRODUCT_LAUNCH: Rocket,
  PRIVATE_EVENT: PartyPopper,
  CUSTOM: Sparkles,
};

export function EventCategories() {
  const { t } = useLocale();

  return (
    <section id="categories" className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-brand-600/15 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t("landing.cat_title_1")}{" "}
            <span className="text-gradient-gold">{t("landing.cat_title_highlight")}</span>
          </h2>
          <p className="mt-3 text-base text-slate-400 sm:text-lg">{t("landing.cat_subtitle_long")}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {EVENT_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type.value] ?? Sparkles;
            const invitationsHref = catalogBrowseHref(type.value);
            const planHref = eventPlanHref(type.value);
            return (
              <article
                key={type.value}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-brand-400/45 hover:bg-white/[0.07] hover:shadow-[0_10px_28px_rgba(11,138,131,0.16)] sm:p-5"
              >
                <Link
                  href={invitationsHref}
                  className="group flex flex-1 flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-500/25 group-hover:text-brand-200">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {t(EVENT_TYPE_KEYS[type.value])}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-snug text-slate-400">
                    {t(PURPOSE_KEYS[type.value])}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-300 group-hover:text-brand-200">
                    {t("landing.cat_browse")}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
                <Link
                  href={planHref}
                  className="mt-3 border-t border-white/10 pt-3 text-sm font-medium text-slate-400 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400/70"
                >
                  {t("landing.cat_plan")}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
