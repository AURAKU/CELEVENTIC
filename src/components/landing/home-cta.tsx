"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";

export function HomeCta() {
  const { t } = useLocale();

  return (
    <section className="py-28 bg-gradient-cta text-white text-center relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-4">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          {t("landing.cta_title")}
        </h2>
        <p className="mt-5 text-lg text-white/80 leading-relaxed">
          {t("landing.cta_subtitle")}
        </p>
        <Button size="lg" variant="secondary" className="mt-10" asChild>
          <Link href="/auth/register">
            {t("landing.cta_button")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
