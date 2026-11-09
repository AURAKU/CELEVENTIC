"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";

export function HomeCta() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden bg-gradient-cta py-16 text-center text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="relative mx-auto max-w-3xl px-4">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {t("landing.cta_title")}
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-white">{t("landing.cta_platform")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" className="w-full min-h-12 sm:w-auto" asChild>
            <Link href="/auth/register?intent=host">
              {t("landing.cta_button")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full min-h-12 border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
            asChild
          >
            <Link href="/auth/register?intent=vendor">{t("landing.cta_vendor")}</Link>
          </Button>
        </div>
        <p className="mt-4 text-base text-white/85">
          <Link href="/auth/register?intent=guest" className="font-semibold underline-offset-2 hover:underline">
            {t("landing.hero_guest_cta")}
          </Link>
          <span className="text-white/50"> · </span>
          <Link href="#services" className="font-medium underline-offset-2 hover:underline">
            {t("landing.hero_explore")}
          </Link>
        </p>
      </div>
    </section>
  );
}
