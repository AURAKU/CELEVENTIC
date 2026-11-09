"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { smartCardSignupPath, smartCardStudioPath } from "@/lib/auth/safe-next-path";
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
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import {
  DIGITAL_CARD_THEMES,
  DIGITAL_CARD_THEME_FILTERS,
  type DigitalCardThemeCategory,
} from "@/lib/digital-business-card/themes";
import { SMARTCARD_PLANS, type SmartCardPlanId } from "@/lib/digital-business-card/plans";
import { demoForTheme, SMARTCARD_HERO_FAN } from "@/lib/digital-business-card/demos";
import {
  SMARTCARD_AUTOMATIONS,
  SMARTCARD_CTA_PRIMARY,
  SMARTCARD_CTA_SECONDARY,
  SMARTCARD_EYEBROW,
  SMARTCARD_HERO_LINE,
  SMARTCARD_HERO_SUPPORT,
  SMARTCARD_PRODUCT_SUPPORT,
} from "@/lib/digital-business-card/product";

const CAPABILITY_ICONS = {
  "Smart QR": QrCode,
  "NFC Tap": Nfc,
  "Offline snapshot": WifiOff,
  "Wallet Ready": Wallet,
  "Connect Back": Handshake,
  "Paid activation": Banknote,
} as const;

function HeroFan() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [7, -7]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(mx, [-40, 40], [-9, 9]), { stiffness: 180, damping: 22 });

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

  const fan = [
    { id: SMARTCARD_HERO_FAN[0], rotate: -14, x: -18, y: 18, z: 1 },
    { id: SMARTCARD_HERO_FAN[1], rotate: 0, x: 0, y: 0, z: 3 },
    { id: SMARTCARD_HERO_FAN[2], rotate: 13, x: 18, y: 16, z: 2 },
  ] as const;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto w-full max-w-[420px] py-6"
      style={{ perspective: 1400 }}
    >
      <div className="relative h-[240px] sm:h-[270px]">
        {fan.map((card) => {
          const demo = demoForTheme(card.id);
          return (
            <motion.div
              key={card.id}
              style={{
                rotateX: rx,
                rotateY: ry,
                transformStyle: "preserve-3d",
                zIndex: card.z,
              }}
              className="absolute left-[8%] right-[8%] top-4 will-change-transform"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: card.y }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: card.z * 0.08 }}
            >
              <div
                className="origin-bottom"
                style={{ transform: `translateX(${card.x}%) rotate(${card.rotate}deg)` }}
              >
                <DigitalCardFace
                  themeId={card.id}
                  displayName={demo.displayName}
                  title={demo.title}
                  company={demo.company}
                  className="shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-teal-100/70">
        Cinema, landmarks, ateliers. Original art, never licensed characters
      </p>
    </div>
  );
}

export function PublicDigitalCardsShowcase({ standalone = false }: { standalone?: boolean }) {
  const { data: session, status } = useSession();
  const [filter, setFilter] = useState<"all" | DigitalCardThemeCategory>("all");
  const [planId, setPlanId] = useState<SmartCardPlanId>("yearly");
  const themes = useMemo(
    () =>
      filter === "all"
        ? DIGITAL_CARD_THEMES
        : DIGITAL_CARD_THEMES.filter((t) => t.category === filter),
    [filter]
  );
  const selectedPlan = SMARTCARD_PLANS.find((p) => p.id === planId) ?? SMARTCARD_PLANS[3];
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const registerHref = signedIn ? smartCardStudioPath(planId) : smartCardSignupPath(planId);
  const themeHref = (themeId: string) =>
    signedIn ? smartCardStudioPath(planId, themeId) : smartCardSignupPath(planId, themeId);

  return (
    <section
      className={standalone ? "" : "mt-20 border-t border-slate-200/80 pt-14"}
      id="smartcard"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#0b1220] to-teal-950 px-5 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 12% 0%, rgba(11,138,131,0.5) 0%, transparent 48%), radial-gradient(ellipse at 92% 88%, rgba(212,166,58,0.28) 0%, transparent 42%), radial-gradient(ellipse at 70% 10%, rgba(192,38,211,0.16) 0%, transparent 36%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
          aria-hidden
        />

        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-teal-200">
              <CreditCard className="h-3.5 w-3.5" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">{SMARTCARD_EYEBROW}</p>
            </div>
            <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-balance text-white sm:text-4xl lg:text-[2.85rem]">
              {SMARTCARD_HERO_LINE}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {SMARTCARD_HERO_SUPPORT}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-200/85">
              {SMARTCARD_PRODUCT_SUPPORT}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="min-h-11 bg-[#0B8A83] px-5 text-white hover:bg-[#097a74]">
                <Link href={registerHref}>
                  {SMARTCARD_CTA_PRIMARY}
                  <ArrowUpRight className="ml-1 h-4 w-4" />
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
              pre-programmed Celeventic NFC tags. We never fake unsupported Web NFC.
            </p>
          </div>
          <HeroFan />
        </div>
      </div>

      <div id="smartcard-plans" className="mt-12 scroll-mt-24">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B8A83]">Live plans</p>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Activate only while you pay.
          </h3>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Design in the studio for free. The public CeleCard. QR, NFC, Wallet, Connect Back. Stays
            offline until a plan is paid. Lapse, and the page goes dark for everyone you meet.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SMARTCARD_PLANS.map((plan) => {
            const active = plan.id === planId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={`relative rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-[#0B8A83] bg-[#0B8A83]/6 shadow-[0_16px_40px_rgba(11,138,131,0.12)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {plan.badge ? (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {plan.badge}
                  </span>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{plan.label}</p>
                <p className="mt-2 font-display text-3xl font-bold text-slate-900">₵{plan.priceGhs}</p>
                <p className="text-xs text-slate-500">₵{plan.perMonthGhs}/mo</p>
                {plan.saveGhs > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#0B8A83]">Save ₵{plan.saveGhs}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Flexible start</p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{plan.blurb}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${active ? "text-[#0B8A83]" : "text-slate-400"}`}>
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                  {active ? "Selected" : "Select"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-[#0B8A83] hover:bg-[#097a74]">
            <Link href={registerHref}>
              Continue with {selectedPlan.label} · ₵{selectedPlan.priceGhs}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-slate-500">Paystack checkout in the studio. Card goes live the moment payment clears.</p>
        </div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SMARTCARD_AUTOMATIONS.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0B8A83]/10 text-[#0B8A83]">
              <Zap className="h-4 w-4" aria-hidden />
            </div>
            <h4 className="font-display text-base font-semibold text-slate-900">{item.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>

      <div id="smartcard-themes" className="mt-14 scroll-mt-24">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B8A83]">Theme collection</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              World-art identities. Not cheap color swaps.
            </h3>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Pop Art, Art Deco, Ukiyo-e, Afrofuturism, cel-shade, marquee. Original compositions
              inspired by movements the world already knows. No licensed characters. Every face has
              its own dummy identity so the gallery never looks copy-pasted.
            </p>
          </div>
          <Button asChild className="shrink-0 bg-[#0B8A83] hover:bg-[#097a74]">
            <Link href={registerHref}>
              Open CeleCard studio
              <Sparkles className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div
          className="mb-6 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter CeleCard themes"
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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {themes.map((theme) => {
            const demo = demoForTheme(theme.id);
            return (
              <article
                key={theme.id}
                className="group flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-500/25 hover:shadow-[0_22px_48px_rgba(11,138,131,0.16)]"
              >
                <div
                  className="relative overflow-hidden"
                  style={{ background: theme.stageBackground }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 42%), linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.42) 100%)",
                    }}
                    aria-hidden
                  />
                  <div className="relative px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
                    <DigitalCardFace
                      themeId={theme.id}
                      displayName={demo.displayName}
                      title={demo.title}
                      company={demo.company}
                      compact
                      className="w-full shadow-[0_24px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/15 transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-4 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                      {theme.previewLabel}
                    </span>
                    {theme.premium ? (
                      <span className="rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-950">
                        Premium
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-2 font-display text-base font-semibold text-slate-900 [overflow-wrap:normal] [word-break:normal]">
                    {theme.name}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{theme.tagline}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {demo.displayName} · {demo.title}
                  </p>
                  <Link
                    href={themeHref(theme.id)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Use this theme
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
