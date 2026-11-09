"use client";

import Link from "next/link";
import { ArrowRight, Heart, Palette, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPES } from "@/lib/constants";
import { catalogBrowseHref } from "@/lib/invitation/catalog-event-type";
import { useLocale } from "@/components/i18n/locale-provider";

const HIGHLIGHTS = [
  { icon: Sparkles, title: "landing.invite_h1", desc: "landing.invite_h1_desc" },
  { icon: Heart, title: "landing.invite_h2", desc: "landing.invite_h2_desc" },
  { icon: QrCode, title: "landing.invite_h3", desc: "landing.invite_h3_desc" },
  { icon: Palette, title: "landing.invite_h4", desc: "landing.invite_h4_desc" },
] as const;

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

export function InvitationExperience() {
  const { t } = useLocale();

  return (
    <section id="invitations" className="relative overflow-hidden bg-white py-16 sm:py-20">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <Badge className="mb-5" variant="secondary">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {t("landing.invite_badge")}
          </Badge>
          <h2 className="section-heading">{t("landing.invite_title")}</h2>
          <p className="section-subheading mx-auto mt-4">{t("landing.invite_subtitle_long")}</p>
        </div>

        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/70 bg-mesh p-4 sm:p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <item.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="font-semibold text-slate-900">{t(item.title)}</p>
              <p className="mt-1 text-sm leading-snug text-slate-500">{t(item.desc)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-[#FAF8F4] p-5 sm:p-7">
          <p className="text-center text-base font-semibold text-slate-900">
            {t("landing.invite_explore_by")}
          </p>
          <p className="mx-auto mt-1 max-w-2xl text-center text-base text-slate-500">
            {t("landing.invite_explore_hint")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {EVENT_TYPES.map((type) => (
              <Link
                key={type.value}
                href={catalogBrowseHref(type.value)}
                className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 transition hover:border-brand-400 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t(EVENT_TYPE_KEYS[type.value] ?? type.label)}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/invitations/catalogue">
                {t("landing.invite_explore_all")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/invitations/create/start">{t("landing.invite_create")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
