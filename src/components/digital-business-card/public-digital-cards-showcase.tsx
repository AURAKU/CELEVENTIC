"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard, Nfc, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { DIGITAL_CARD_MONTHLY_PRICE_GHS } from "@/lib/digital-business-card/types";

const DEMO = {
  displayName: "Ama Mensah",
  title: "Founder",
  company: "Celeventic",
};

export function PublicDigitalCardsShowcase() {
  return (
    <section className="mt-20 border-t border-slate-200/80 pt-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[#0B8A83] mb-2">
            <CreditCard className="h-4 w-4" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Digital business cards</p>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            One page for every contact
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Choose a theme, connect LinkedIn, WhatsApp, website and more, then share with QR or NFC.
            Guests open a premium profile — download your contact, explore socials, and return anytime
            while your monthly plan keeps the link live.
          </p>
        </div>
        <Button asChild className="shrink-0 bg-[#0B8A83] hover:bg-[#097a74]">
          <Link href="/auth/register?next=/dashboard/business-card">
            Create your card
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
          <QrCode className="h-3.5 w-3.5 text-[#0B8A83]" /> Smart QR
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
          <Nfc className="h-3.5 w-3.5 text-[#0B8A83]" /> NFC ready
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 text-[#0B8A83]" /> ₵{DIGITAL_CARD_MONTHLY_PRICE_GHS}/mo live link
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {DIGITAL_CARD_THEMES.map((theme) => (
          <article
            key={theme.id}
            className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all flex flex-col"
          >
            <div
              className="relative h-[200px] border-b border-slate-200/60 overflow-hidden flex items-center justify-center p-4"
              style={{ background: theme.stageBackground }}
            >
              <DigitalCardFace
                themeId={theme.id}
                displayName={DEMO.displayName}
                title={DEMO.title}
                company={DEMO.company}
                compact
                className="max-w-[260px] shadow-lg"
              />
              <div className="absolute top-3 left-3">
                <span className="rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                  {theme.premium ? "Premium theme" : "Business card"}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-display text-base font-semibold text-slate-900">{theme.name}</h3>
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">{theme.tagline}</p>
              <Link
                href="/auth/register?next=/dashboard/business-card"
                className="mt-3 text-xs font-semibold text-[#0B8A83] hover:underline"
              >
                Use this theme →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
