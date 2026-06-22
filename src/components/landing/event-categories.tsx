"use client";

import { EVENT_TYPES } from "@/lib/constants";
import { useLocale } from "@/components/i18n/locale-provider";

const categoryIcons: Record<string, string> = {
  WEDDING: "💍",
  FUNERAL: "🕊️",
  BIRTHDAY: "🎂",
  CONFERENCE: "🎤",
  CHURCH_PROGRAM: "⛪",
  CORPORATE_EVENT: "🏢",
  CONCERT: "🎵",
  FESTIVAL: "🎪",
  SCHOOL_EVENT: "🎓",
  PRODUCT_LAUNCH: "🚀",
  PRIVATE_EVENT: "🔒",
  CUSTOM: "✨",
};

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

export function EventCategories() {
  const { t } = useLocale();

  return (
    <section id="categories" className="py-28 bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t("landing.cat_title_1")}{" "}
            <span className="text-gradient-gold">{t("landing.cat_title_highlight")}</span>
          </h2>
          <p className="mt-4 text-slate-400 text-lg">
            {t("landing.cat_subtitle_long")}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {EVENT_TYPES.map((type) => (
            <div
              key={type.value}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-brand-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(11,138,131,0.15)] transition-all cursor-default group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">{categoryIcons[type.value]}</span>
              <span className="text-sm font-semibold text-slate-300">{t(EVENT_TYPE_KEYS[type.value])}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
