"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemplateCard } from "@/components/invitation-mvp/template-card";
import { useLocale } from "@/components/i18n/locale-provider";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { INVITATION_REVIEWS } from "@/lib/invitation-mvp/reviews";
import type { InvitationPackageDef } from "@/lib/invitation-mvp/packages";

interface Props {
  packages: InvitationPackageDef[];
}

export function InvitationsLandingContent({ packages }: Props) {
  const { t } = useLocale();
  const featured = CATALOG_TEMPLATES;

  const steps = [
    { step: "01", title: t("invitations.step1_title"), desc: t("invitations.step1_desc") },
    { step: "02", title: t("invitations.step2_title"), desc: t("invitations.step2_desc") },
    { step: "03", title: t("invitations.step3_title"), desc: t("invitations.step3_desc") },
    { step: "04", title: t("invitations.step4_title"), desc: t("invitations.step4_desc") },
  ];

  const included = [
    t("invitations.inc_mobile"),
    t("invitations.inc_rsvp"),
    t("invitations.inc_maps"),
    t("invitations.inc_share"),
    t("invitations.inc_qr"),
    t("invitations.inc_packages"),
    t("invitations.inc_designer"),
    t("invitations.inc_archive"),
  ];

  const faq = [
    { q: t("invitations.faq_q1"), a: t("invitations.faq_a1") },
    { q: t("invitations.faq_q2"), a: t("invitations.faq_a2") },
    { q: t("invitations.faq_q3"), a: t("invitations.faq_a3") },
    { q: t("invitations.faq_q4"), a: t("invitations.faq_a4") },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0B8A83] to-[#097068] text-white py-20 sm:py-28">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-white/10 text-[#D4A63A] border-white/20">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> {t("invitations.badge")}
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            {t("invitations.hero_title")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            {t("invitations.hero_subtitle")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/invitations/catalogue">{t("invitations.explore_catalogue")} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
              <Link href="/auth/register">{t("invitations.start_free")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#FAF8F4] text-center">
        <div className="mx-auto max-w-3xl px-4">
          <Heart className="h-8 w-8 mx-auto text-[#FF6B57] mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{t("invitations.every_celebration")}</h2>
          <p className="mt-4 text-slate-600">{t("invitations.every_celebration_desc")}</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-3xl font-bold text-center text-[#0F172A] mb-12">{t("invitations.how_it_works")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200/80 p-6 bg-[#FAF8F4]">
                <span className="text-3xl font-display font-bold text-[#0B8A83]/30">{item.step}</span>
                <h3 className="font-semibold text-[#0F172A] mt-2">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-mesh">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-display text-3xl font-bold text-[#0F172A]">
              {t("invitations.catalogue_preview")} ({featured.length})
            </h2>
            <Button variant="outline" asChild><Link href="/invitations/catalogue">{t("invitations.view_all")}</Link></Button>
          </div>
          <p className="text-sm text-slate-500 mb-6 -mt-6">Live scrolling previews — see exactly how each invitation flows for guests.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((tpl) => <TemplateCard key={tpl.slug} template={tpl} />)}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#0F172A]">{t("invitations.whats_included")}</h2>
            <p className="mt-4 text-slate-600">{t("invitations.whats_included_desc")}</p>
            <ul className="mt-8 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-700">
                  <Check className="h-5 w-5 text-[#0B8A83]" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {packages.slice(0, 4).map((pkg) => (
              <div key={pkg.slug} className="rounded-2xl border border-slate-200/80 p-5 bg-[#FAF8F4]">
                <p className="font-semibold text-[#0F172A]">{pkg.name}</p>
                <p className="text-2xl font-bold text-[#0B8A83] mt-1">
                  {pkg.priceGhs === 0 ? t("common.free") : `₵${pkg.priceGhs}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0F172A] text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">{t("invitations.loved_by")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {INVITATION_REVIEWS.map((r) => (
              <div key={r.author} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-white/90 italic">&ldquo;{r.content}&rdquo;</p>
                <p className="mt-4 font-semibold text-[#D4A63A]">{r.author}</p>
                <p className="text-sm text-white/50">{r.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#FAF8F4]">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold text-center text-[#0F172A] mb-10">{t("invitations.faq_title")}</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-xl border border-slate-200/80 bg-white p-5">
                <p className="font-semibold text-[#0F172A]">{item.q}</p>
                <p className="text-sm text-slate-600 mt-2">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#0B8A83] to-[#097068] text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-3xl font-bold">{t("invitations.ready_title")}</h2>
          <p className="mt-4 text-white/80">{t("invitations.ready_subtitle")}</p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/invitations/catalogue">{t("invitations.start_invitation")} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
