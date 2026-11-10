"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { smartCardLoginPath, smartCardSignupPath, smartCardStudioPath } from "@/lib/auth/safe-next-path";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
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
import { SMARTCARD_PLANS, type SmartCardPlan, type SmartCardPlanId } from "@/lib/digital-business-card/plans";
import { demoForTheme, SMARTCARD_HERO_FAN } from "@/lib/digital-business-card/demos";
import {
  SMARTCARD_AUTOMATIONS,
  SMARTCARD_BRAND_TAGLINE,
  SMARTCARD_CTA_PRIMARY,
  SMARTCARD_CTA_SECONDARY,
  SMARTCARD_HERO_LINE,
  SMARTCARD_HERO_SUPPORT,
} from "@/lib/digital-business-card/product";
import {
  demoCardHubPath,
  demoCardPreviewExplorePath,
  demoCardPreviewQrSrc,
} from "@/lib/digital-business-card/demo-card";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { canAccessAdminPanel } from "@/lib/rbac/permissions";

const CAPABILITY_ICONS = {
  "Smart QR": QrCode,
  "NFC Tap": Nfc,
  "Offline snapshot": WifiOff,
  "Wallet Ready": Wallet,
  "Connect Back": Handshake,
  "Paid activation": Banknote,
} as const;

const HERO_FAN_SLOTS = [
  { rotate: -17, x: "-24%", y: 18, z: 1, scale: 0.9 },
  { rotate: 0, x: "0%", y: 0, z: 4, scale: 1.06 },
  { rotate: 16, x: "24%", y: 16, z: 2, scale: 0.92 },
] as const;

function heroFanSlot(cardIndex: number, front: number, count: number) {
  const rel = (cardIndex - front + count) % count;
  if (rel === 0) return HERO_FAN_SLOTS[1];
  if (rel === 1) return HERO_FAN_SLOTS[2];
  return HERO_FAN_SLOTS[0];
}

function HeroFan() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { amount: 0.35 });
  const ids = SMARTCARD_HERO_FAN;
  const count = ids.length;
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [7, -7]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(mx, [-40, 40], [-9, 9]), { stiffness: 180, damping: 22 });

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || hidden || !inView) return;
    const tick = window.setInterval(() => {
      setFront((current) => (current + 1) % count);
    }, 3800);
    return () => window.clearInterval(tick);
  }, [count, hidden, inView, paused, reduceMotion]);

  function onMove(e: MouseEvent) {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 80);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 80);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
    setPaused(false);
  }

  function shuffleNext() {
    setFront((current) => (current + 1) % count);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={onLeave}
      onClick={shuffleNext}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          shuffleNext();
        }
      }}
      role="group"
      tabIndex={0}
      aria-label="CeleYou identity cards. Click or press Enter to shuffle the stack."
      className="relative mx-auto w-full max-w-[480px] cursor-pointer py-6 outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="relative h-[320px] sm:h-[372px]"
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      >
        {reduceMotion ? null : (
          <motion.div
            className="pointer-events-none absolute inset-[-18%] rounded-full opacity-70"
            style={{
              background:
                "conic-gradient(from 120deg, transparent 0deg, rgba(45,212,191,0.16) 70deg, transparent 140deg, rgba(212,166,58,0.12) 220deg, transparent 300deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            aria-hidden
          />
        )}
        <motion.div
          className="pointer-events-none absolute bottom-5 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-full bg-black/45 blur-xl"
          animate={reduceMotion ? undefined : { scaleX: [0.86, 1, 0.86], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        {ids.map((id, index) => {
          const demo = demoForTheme(id);
          const slot = heroFanSlot(index, front, count);
          const isFront = slot.z === 4;
          return (
            <motion.div
              key={id}
              className="absolute left-[4%] right-[4%] top-3 origin-bottom will-change-transform"
              style={{ zIndex: slot.z, transformStyle: "preserve-3d" }}
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.92 }}
              animate={{
                opacity: 1,
                x: slot.x,
                y: slot.y,
                rotate: slot.rotate,
                scale: slot.scale,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 140, damping: 18, mass: 0.9 }
              }
            >
              <motion.div
                animate={
                  reduceMotion
                    ? { y: 0 }
                    : { y: isFront ? [0, -8, 0] : [0, -4, 0] }
                }
                transition={{
                  duration: isFront ? 3.4 : 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.18,
                }}
              >
                <DigitalCardFace
                  themeId={id}
                  displayName={demo.displayName}
                  title={demo.title}
                  company={demo.company}
                  avatarUrl={demo.avatarUrl}
                  qrSrc={demoCardPreviewQrSrc(id)}
                  qrBadgeHref={demoCardPreviewExplorePath()}
                  companyLogo={demo.companyLogo}
                  className={
                    isFront
                      ? "shadow-[0_34px_90px_rgba(0,0,0,0.5)]"
                      : "shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
                  }
                />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

export function PublicDigitalCardsShowcase({ standalone = false }: { standalone?: boolean }) {
  const { data: session, status } = useSession();
  const [filter, setFilter] = useState<"all" | DigitalCardThemeCategory>("all");
  const [planId, setPlanId] = useState<SmartCardPlanId>("yearly");
  const [plans, setPlans] = useState<SmartCardPlan[]>(SMARTCARD_PLANS);
  const themes = useMemo(
    () =>
      filter === "all"
        ? DIGITAL_CARD_THEMES
        : DIGITAL_CARD_THEMES.filter((t) => t.category === filter),
    [filter]
  );
  const selectedPlan = plans.find((p) => p.id === planId) ?? plans[plans.length - 1] ?? SMARTCARD_PLANS[3];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/digital-business-cards/plans");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data?.plans) && json.data.plans.length) {
          setPlans(json.data.plans as SmartCardPlan[]);
        }
      } catch {
        /* keep catalog fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const showDummyLive = canAccessAdminPanel(session?.user?.role);
  const registerHref = signedIn ? smartCardStudioPath(planId) : smartCardSignupPath(planId);
  const loginHref = smartCardLoginPath(planId);
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
            <CeleYouBrandMark variant="chip" tone="dark" className="mb-4" markClassName="h-10 w-10" />
            <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-balance text-white sm:text-4xl lg:text-[2.85rem]">
              {SMARTCARD_HERO_LINE}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {SMARTCARD_HERO_SUPPORT}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-teal-200/85">
              <span className="h-px w-7 bg-teal-300/45" aria-hidden />
              {SMARTCARD_BRAND_TAGLINE}
              <span className="h-px w-7 bg-teal-300/45" aria-hidden />
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="min-h-11 bg-[#0B8A83] px-5 text-white hover:bg-[#097a74]">
                <Link href={registerHref}>
                  {SMARTCARD_CTA_PRIMARY}
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              {signedIn ? null : (
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={loginHref}>Sign in with your Celeventic account</Link>
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                className="min-h-11 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#smartcard-themes">{SMARTCARD_CTA_SECONDARY}</a>
              </Button>
              {showDummyLive ? (
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 border-amber-200/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20 hover:text-white"
                >
                  <Link href={demoCardHubPath()}>See a live dummy tap</Link>
                </Button>
              ) : null}
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
            <p className="mt-4 max-w-lg text-xs leading-relaxed text-slate-100 sm:text-[13px]">
              Any iPhone or Android camera can scan the QR. An NFC tap on a Celeventic card opens the
              same live page. Socials, number, WhatsApp, and website. One stop, in the
              theme they activated.
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
            Design in the studio for free. The public CeleYou. QR, NFC, Wallet, Connect Back. Stays
            offline until a plan is paid. Lapse, and the page goes dark for everyone you meet.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
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
          <Button asChild variant="outline">
            <Link href="/celecard/concierge">Have our team design it for you</Link>
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
              Open CeleYou studio
              <Sparkles className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div
          className="mb-6 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter CeleYou themes"
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
                className="group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-500/25 hover:shadow-[0_22px_48px_rgba(11,138,131,0.16)]"
              >
                <Link
                  href={themeHref(theme.id)}
                  className="absolute inset-0 z-10 rounded-[1.35rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  aria-label={`Use ${theme.name} card`}
                />
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
                  <div className="pointer-events-none relative px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
                    <DigitalCardFace
                      themeId={theme.id}
                      displayName={demo.displayName}
                      title={demo.title}
                      company={demo.company}
                      avatarUrl={demo.avatarUrl}
                      qrSrc={demoCardPreviewQrSrc(theme.id)}
                      companyLogo={demo.companyLogo}
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
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                    Use this Card
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
