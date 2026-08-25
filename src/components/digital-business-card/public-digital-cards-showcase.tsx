"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowUpRight,
  CreditCard,
  Nfc,
  QrCode,
  Sparkles,
  Wallet,
  Handshake,
  Banknote,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import {
  DIGITAL_CARD_THEMES,
  DIGITAL_CARD_THEME_FILTERS,
  type DigitalCardThemeCategory,
} from "@/lib/digital-business-card/themes";
import { DIGITAL_CARD_MONTHLY_PRICE_GHS } from "@/lib/digital-business-card/types";
import {
  SMARTCARD_CTA_PRIMARY,
  SMARTCARD_CTA_SECONDARY,
  SMARTCARD_EYEBROW,
  SMARTCARD_HERO_LINE,
  SMARTCARD_HERO_SUPPORT,
  SMARTCARD_PRODUCT_SUPPORT,
} from "@/lib/digital-business-card/product";

const DEMO = {
  displayName: "Ama Mensah",
  title: "Founder",
  company: "Celeventic",
};

const CAPABILITY_ICONS = {
  "Smart QR": QrCode,
  "NFC Tap": Nfc,
  "Offline Ready": WifiOff,
  "Wallet Ready": Wallet,
  "Contact Exchange": Handshake,
  "Payment Ready": Banknote,
} as const;

function HeroCardPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [8, -8]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(mx, [-40, 40], [-10, 10]), { stiffness: 180, damping: 22 });

  function onMove(e: MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 80);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 80);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto w-full max-w-[320px] perspective-[1200px]"
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="will-change-transform"
      >
        <DigitalCardFace
          themeId="founder"
          displayName={DEMO.displayName}
          title={DEMO.title}
          company={DEMO.company}
          className="shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
        />
      </motion.div>
      <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        Live SmartCard preview
      </p>
    </div>
  );
}

export function PublicDigitalCardsShowcase() {
  const [filter, setFilter] = useState<"all" | DigitalCardThemeCategory>("all");
  const themes = useMemo(
    () =>
      filter === "all"
        ? DIGITAL_CARD_THEMES
        : DIGITAL_CARD_THEMES.filter((t) => t.category === filter),
    [filter]
  );

  return (
    <section className="mt-20 border-t border-slate-200/80 pt-14" id="smartcard">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-5 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, rgba(11,138,131,0.45) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(212,166,58,0.22) 0%, transparent 45%)",
          }}
          aria-hidden
        />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-teal-300/95 mb-3">
              <CreditCard className="h-4 w-4" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                {SMARTCARD_EYEBROW}
              </p>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white tracking-tight text-balance leading-[1.12]">
              {SMARTCARD_HERO_LINE}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              {SMARTCARD_HERO_SUPPORT}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-200/80">
              {SMARTCARD_PRODUCT_SUPPORT}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-[#0B8A83] hover:bg-[#097a74] text-white min-h-11 px-5">
                <Link href="/auth/register?next=/dashboard/business-card">
                  {SMARTCARD_CTA_PRIMARY}
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#smartcard-themes">{SMARTCARD_CTA_SECONDARY}</a>
              </Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-2">
              {(Object.keys(CAPABILITY_ICONS) as (keyof typeof CAPABILITY_ICONS)[]).map((label) => {
                const Icon = CAPABILITY_ICONS[label];
                return (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200"
                  >
                    <Icon className="h-3.5 w-3.5 text-teal-300" aria-hidden />
                    {label}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 max-w-lg text-[11px] leading-relaxed text-slate-400">
              NFC writing works in Chrome on Android. iPhone guests share via QR, Wallet QR, link, or
              pre-programmed Celeventic NFC tags — we never fake unsupported Web NFC.
            </p>
          </div>
          <HeroCardPreview />
        </div>
      </div>

      {/* Themes */}
      <div id="smartcard-themes" className="mt-12 scroll-mt-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B8A83]">
              Theme collection
            </p>
            <h3 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              One identity. Many faces.
            </h3>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Genuine compositions — not color swaps. Share as Professional, Creator, or Event without
              duplicating your identity. Monthly plan keeps your Smart link live (₵
              {DIGITAL_CARD_MONTHLY_PRICE_GHS}/mo).
            </p>
          </div>
          <Button asChild className="shrink-0 bg-[#0B8A83] hover:bg-[#097a74]">
            <Link href="/auth/register?next=/dashboard/business-card">
              Open SmartCard studio
              <Sparkles className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div
          className="mb-6 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter SmartCard themes"
        >
          {DIGITAL_CARD_THEME_FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`snap-start shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-[#0B8A83] bg-[#0B8A83] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {themes.map((theme) => (
            <article
              key={theme.id}
              className="group rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_16px_48px_rgba(11,138,131,0.12)] transition-all flex flex-col"
            >
              <div
                className="relative h-[210px] border-b border-slate-200/60 overflow-hidden flex items-center justify-center p-4"
                style={{ background: theme.stageBackground }}
              >
                <DigitalCardFace
                  themeId={theme.id}
                  displayName={DEMO.displayName}
                  title={DEMO.title}
                  company={DEMO.company}
                  compact
                  className="max-w-[260px] shadow-lg transition-transform duration-300 group-hover:-translate-y-1"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                    {theme.previewLabel}
                  </span>
                  {theme.premium ? (
                    <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                      Premium
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h4 className="font-display text-base font-semibold text-slate-900">{theme.name}</h4>
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
      </div>
    </section>
  );
}
