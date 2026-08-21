"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { JourneyPreviewStrip } from "@/components/celeventic-guide/journey-preview-strip";
import { GUEST_JOURNEY_STAGES } from "@/lib/celeventic-guide/platform-journey";

export function HowItWorks() {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/30 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="section-heading">
            {t("landing.how_works_title")}{" "}
            <span className="text-gradient">{t("landing.how_works_brand")}</span>{" "}
            {t("landing.how_works_suffix")}
          </h2>
          <p className="section-subheading mx-auto">
            From the first invitation tap to Memory Vault — guests, hosts, door staff, and vendors
            each have a clear path. Watch the journey below, then open any guide for step-by-step
            detail.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/guide/how-celeventic-works"
              className="inline-flex items-center rounded-xl bg-brand-700 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-800 transition"
            >
              See How It Works
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center rounded-xl border border-brand-200 bg-white/80 text-brand-800 px-5 py-2.5 text-sm font-semibold hover:border-brand-400 transition"
            >
              Browse Celeventic Guide
            </Link>
          </div>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
          {GUEST_JOURNEY_STAGES.map((item, i) => (
            <motion.li
              key={item.id}
              className="relative text-center"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: reduce ? 0 : i * 0.04, duration: 0.3 }}
            >
              {i < GUEST_JOURNEY_STAGES.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[58%] w-[84%] h-px bg-gradient-to-r from-brand-300 to-transparent" />
              )}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white text-sm font-bold mb-3 shadow-[0_8px_24px_rgba(11,138,131,0.3)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display font-semibold text-slate-900 text-base">{item.label}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                {item.headline}
              </p>
            </motion.li>
          ))}
        </ol>

        <JourneyPreviewStrip />
      </div>
    </section>
  );
}
