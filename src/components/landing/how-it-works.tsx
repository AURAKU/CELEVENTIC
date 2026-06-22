"use client";

import { useLocale } from "@/components/i18n/locale-provider";

const STEP_KEYS = [
  { step: "01", title: "landing.how_old_s1_title", desc: "landing.how_old_s1_desc" },
  { step: "02", title: "landing.how_old_s2_title", desc: "landing.how_old_s2_desc" },
  { step: "03", title: "landing.how_old_s3_title", desc: "landing.how_old_s3_desc" },
  { step: "04", title: "landing.how_old_s4_title", desc: "landing.how_old_s4_desc" },
] as const;

export function HowItWorks() {
  const { t } = useLocale();

  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/30 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="section-heading">
            {t("landing.how_works_title")}{" "}
            <span className="text-gradient">{t("landing.how_works_brand")}</span>{" "}
            {t("landing.how_works_suffix")}
          </h2>
          <p className="section-subheading mx-auto">{t("landing.how_subtitle_short")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEP_KEYS.map((item, i) => (
            <div key={item.step} className="relative text-center group">
              {i < STEP_KEYS.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand-300 to-transparent" />
              )}
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white text-lg font-bold mb-5 shadow-[0_8px_24px_rgba(11,138,131,0.35)] group-hover:scale-105 transition-transform">
                {item.step}
              </div>
              <h3 className="font-display font-semibold text-slate-900 text-lg">{t(item.title)}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{t(item.desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
