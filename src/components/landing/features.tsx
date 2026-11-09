"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Compass,
  CreditCard,
  Mail,
  QrCode,
  Store,
  Ticket,
  Archive,
  Heart,
  Gem,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

const SERVICES: Array<{
  href: string;
  startHref: string;
  startKey: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  popular?: boolean;
}> = [
  {
    href: "/invitations/catalogue",
    startHref: "/invitations/create/start",
    startKey: "landing.svc_start_invite",
    icon: Mail,
    title: "landing.svc_invite_title",
    desc: "landing.svc_invite_desc",
    popular: true,
  },
  {
    href: "/discover",
    startHref: "/auth/register?intent=host",
    startKey: "landing.svc_start_sell",
    icon: Ticket,
    title: "landing.svc_tickets_title",
    desc: "landing.svc_tickets_desc",
  },
  {
    href: "/marketplace",
    startHref: "/auth/register?intent=vendor",
    startKey: "landing.svc_start_vendor",
    icon: Store,
    title: "landing.svc_market_title",
    desc: "landing.svc_market_desc",
  },
  {
    href: "/digital-cards",
    startHref: "/auth/register?intent=smartcard&next=/dashboard/business-card",
    startKey: "landing.svc_start_card",
    icon: CreditCard,
    title: "landing.svc_cards_title",
    desc: "landing.svc_cards_desc",
  },
  {
    href: "/guide/how-celeventic-works",
    startHref: "/auth/register?intent=host",
    startKey: "landing.svc_start_event",
    icon: Calendar,
    title: "landing.svc_events_title",
    desc: "landing.svc_events_desc",
  },
  {
    href: "/discover",
    startHref: "/auth/register?intent=guest",
    startKey: "landing.svc_start_attend",
    icon: Compass,
    title: "landing.svc_discover_title",
    desc: "landing.svc_discover_desc",
  },
];

const ALSO: Array<{ href: string; icon: LucideIcon; title: string }> = [
  { href: "/guide/how-celeventic-works", icon: QrCode, title: "landing.also_qr" },
  { href: "/guide", icon: Archive, title: "landing.also_vault" },
  { href: "/invitations/catalogue?eventType=WEDDING", icon: Gem, title: "landing.also_wedding" },
  { href: "/invitations/catalogue?eventType=FUNERAL", icon: Heart, title: "landing.also_funeral" },
];

export function Features() {
  const { t } = useLocale();

  return (
    <section id="services" className="relative bg-mesh py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <span className="badge-pill mb-6 border border-brand-200 bg-brand-100 text-brand-700">
            {t("landing.svc_badge")}
          </span>
          <h2 className="section-heading">{t("landing.svc_title")}</h2>
          <p className="section-subheading mx-auto">{t("landing.svc_subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((item) => (
            <article
              key={item.title}
              className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="icon-box">
                  <item.icon className="h-6 w-6" aria-hidden />
                </span>
                {item.popular ? (
                  <span className="rounded-full bg-[#0B8A83] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                    {t("landing.svc_popular")}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">{t(item.title)}</h3>
              <p className="mt-2 flex-1 text-base leading-relaxed text-slate-600">{t(item.desc)}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#0B8A83] px-4 text-base font-semibold text-white transition hover:bg-[#097068]"
                >
                  {t("landing.svc_explore")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href={item.startHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-base font-semibold text-slate-800 transition hover:border-brand-400 hover:text-brand-700"
                >
                  {t(item.startKey)}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/70 p-5">
          <p className="text-center text-base font-semibold text-slate-900">{t("landing.also_title")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ALSO.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-800 transition hover:border-brand-400 hover:text-brand-700"
              >
                <item.icon className="h-4 w-4 text-brand-600" aria-hidden />
                {t(item.title)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
