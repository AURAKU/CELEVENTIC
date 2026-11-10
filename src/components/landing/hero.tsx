"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Mail,
  Store,
  Ticket,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { BrandMotto } from "@/components/brand/brand-motto";
import { useLocale } from "@/components/i18n/locale-provider";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";

const HeroScene = dynamic(() => import("@/components/landing/hero-scene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
});

const HERO_SERVICES: Array<{
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: "/invitations/catalogue", labelKey: "landing.pill_invitations", icon: Mail },
  { href: "/discover", labelKey: "landing.pill_tickets", icon: Ticket },
  { href: "/marketplace", labelKey: "landing.pill_marketplace", icon: Store },
  { href: "/digital-cards", labelKey: "landing.pill_cards", icon: CeleYouMarkIcon },
];

export function Hero() {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();

  const copyMotion = reduceMotion
    ? undefined
    : { initial: { opacity: 1, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55 } };
  const panelMotion = reduceMotion
    ? undefined
    : { initial: { opacity: 1, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: 0.12 } };

  return (
    <section className="relative min-h-app-viewport overflow-hidden bg-gradient-hero text-white">
      <ClientErrorBoundary>
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          <HeroScene />
        </div>
      </ClientErrorBoundary>
      <div className="absolute inset-0 z-0 grid-pattern opacity-20 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute top-20 left-10 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl animate-shimmer" />
        <div className="absolute bottom-10 right-10 h-[500px] w-[500px] rounded-full bg-accent-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-[clamp(2.25rem,5.5vh,7rem)] sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div className="min-w-0" {...copyMotion}>
            <BrandMotto size="xl" variant="hero" className="mb-4 sm:mb-6" />
            <h1 className="font-display max-w-full text-[clamp(1.85rem,5.4vw+0.55rem,4.15rem)] font-bold leading-[1.12] tracking-tight text-white text-balance">
              {t("landing.hero_title_1")}{" "}
              <span className="text-gradient-gold">{t("landing.hero_title_event")}</span>{" "}
              {t("landing.hero_title_2")}
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(1.05rem,1.4vw+0.7rem,1.35rem)] leading-relaxed text-white/90">
              {t("landing.hero_platform")}
            </p>
            <div className="action-row mt-8 sm:mt-10 sm:max-w-xl">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/register?intent=host">
                  {t("landing.hero_create_account")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                asChild
              >
                <Link href="#services">{t("landing.hero_explore")}</Link>
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-base text-white/85">
              <span className="min-w-0">{t("landing.hero_guest_lead")}</span>
              <Link
                href="/auth/register?intent=guest"
                className="whitespace-nowrap font-semibold text-gold-300 hover:text-gold-200 hover:underline"
              >
                {t("landing.hero_guest_cta")}
              </Link>
              <Link href="/auth/login" className="whitespace-nowrap font-medium text-white hover:underline">
                {t("common.sign_in")}
              </Link>
              <Link
                href="/auth/register?intent=vendor"
                className="whitespace-nowrap font-medium text-white hover:underline"
              >
                {t("landing.hero_vendor_cta")}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 lg:hidden">
              {HERO_SERVICES.map((item) => (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-base font-semibold text-white backdrop-blur-sm transition hover:border-gold-400/50 hover:bg-white/15"
                >
                  <item.icon
                    className={item.labelKey === "landing.pill_cards" ? "h-5 w-5" : "h-4 w-4 text-gold-300"}
                    aria-hidden
                  />
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div className="hidden lg:block" {...panelMotion}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500/20 to-accent-500/20 blur-2xl" />
              <div className="relative rounded-2xl border border-white/15 bg-white/5 p-5 shadow-2xl backdrop-blur-md sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">
                  {t("landing.hero_os_kicker")}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{t("landing.hero_os_title")}</p>
                <p className="mt-1 text-base leading-relaxed text-white/75">{t("landing.hero_os_support")}</p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {HERO_SERVICES.map((item) => (
                    <Link
                      key={`panel-${item.labelKey}`}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/8 p-4 transition hover:border-brand-300/40 hover:bg-white/12"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-gold-300">
                        <item.icon
                          className={item.labelKey === "landing.pill_cards" ? "h-8 w-8" : "h-5 w-5"}
                          aria-hidden
                        />
                      </span>
                      <span className="text-base font-semibold text-white">{t(item.labelKey)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
