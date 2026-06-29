"use client";

import { motion } from "framer-motion";
import type { InvitationLayoutSlug } from "@/types/invitation-design";

export interface TemplateHeroContext {
  layout: InvitationLayoutSlug | string;
  name1: string;
  name2: string;
  intro: string;
  dateLine: string;
  time: string;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    script?: string;
    body?: string;
  };
}

function HeroShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`text-center px-6 sm:px-8 max-w-2xl mx-auto ${className}`}>{children}</div>;
}

/** Each layout slug gets its own standalone hero — no shared layouts. */
export function renderTemplateHero(ctx: TemplateHeroContext) {
  const { layout, name1, name2, intro, dateLine, time, colors, fonts } = ctx;
  const primary = colors.primary ?? "#F5F0E6";
  const secondary = colors.secondary ?? "#D4AF37";
  const bodyFont = fonts?.body;

  switch (layout) {
    case "classic-gold":
      return (
        <HeroShell>
          <div className="inline-block border-4 border-double px-8 py-6 mb-6" style={{ borderColor: secondary }}>
            <p className="text-[10px] uppercase tracking-[0.45em] opacity-70 mb-4" style={{ color: secondary, fontFamily: bodyFont }}>{intro}</p>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl uppercase tracking-[0.2em]" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          </div>
          <p className="font-[family-name:var(--font-cinzel)] tracking-[0.35em] text-sm" style={{ color: secondary }}>{dateLine}</p>
          <p className="mt-2 text-xs opacity-60">{time}</p>
        </HeroShell>
      );

    case "arch-green":
      return (
        <HeroShell>
          <div className="relative mx-auto w-64 sm:w-72 mb-6">
            <div className="absolute inset-x-4 top-0 h-full rounded-t-[999px] border-2 border-emerald-400/40 bg-emerald-950/30" />
            <div className="relative pt-16 pb-8 px-6">
              <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/70 mb-3">{intro}</p>
              <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl" style={{ color: primary }}>{name1}{name2 && <span className="block text-lg mt-2 opacity-80">{name2}</span>}</h1>
            </div>
          </div>
          <p className="text-emerald-200/80 text-sm tracking-widest">{dateLine}</p>
        </HeroShell>
      );

    case "rustic-lace":
      return (
        <HeroShell>
          <p className="text-[10px] uppercase tracking-[0.5em] text-amber-200/60 mb-4">{intro}</p>
          <div className="border-y border-dashed border-amber-100/30 py-8 px-4 mb-4">
            <h1 className="font-[family-name:var(--font-great-vibes)] text-4xl sm:text-5xl" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          </div>
          <p className="font-[family-name:var(--font-playfair)] text-sm tracking-wider opacity-80">{dateLine} · {time}</p>
        </HeroShell>
      );

    case "boho-hexagon":
      return (
        <HeroShell>
          <motion.div
            className="mx-auto w-40 h-40 flex items-center justify-center mb-6"
            style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: `${secondary}33`, border: `2px solid ${secondary}` }}
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <span className="text-xs uppercase tracking-widest opacity-70">RSVP</span>
          </motion.div>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-4xl sm:text-5xl" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-6 text-xs uppercase tracking-[0.4em] opacity-50">{dateLine}</p>
        </HeroShell>
      );

    case "luxury-rings":
      return (
        <HeroShell>
          <div className="flex justify-center gap-3 mb-6 opacity-90">
            <div className="w-10 h-10 rounded-full border-2" style={{ borderColor: secondary }} />
            <div className="w-10 h-10 rounded-full border-2 -ml-4" style={{ borderColor: secondary }} />
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl uppercase tracking-[0.15em] font-light" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-8 text-xs uppercase tracking-[0.5em]" style={{ color: secondary }}>{intro}</p>
          <p className="mt-4 font-light tracking-widest">{dateLine}</p>
        </HeroShell>
      );

    case "custom-media":
      return (
        <HeroShell className="max-w-3xl">
          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-none" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-2xl sm:text-3xl mt-4 font-light opacity-60">{name2}</p>}
          <div className="mt-10 inline-block px-4 py-1 rounded-full border border-white/20 text-[10px] uppercase tracking-[0.4em]">{intro}</div>
          <p className="mt-6 text-sm opacity-50">{dateLine}</p>
        </HeroShell>
      );

    case "passport-luxe":
      return (
        <HeroShell>
          <div className="inline-block border-2 border-dashed border-amber-400/70 rounded-lg px-8 py-5 rotate-[-3deg] mb-6 bg-slate-900/50">
            <p className="text-amber-300 text-[10px] uppercase tracking-[0.6em]">Passport · Visa</p>
            <h1 className="font-[family-name:var(--font-cinzel)] text-xl uppercase mt-3 tracking-wider" style={{ color: primary }}>{name1} · {name2 || "Guest"}</h1>
          </div>
          <p className="text-amber-200/70 text-sm">{dateLine} · {time}</p>
        </HeroShell>
      );

    case "glass-acrylic":
      return (
        <HeroShell>
          <div className="backdrop-blur-xl bg-white/10 border border-white/25 rounded-2xl px-8 py-10 shadow-[0_8px_32px_rgba(56,189,248,0.15)]">
            <p className="text-[10px] uppercase tracking-[0.45em] text-sky-200/70 mb-4">{intro}</p>
            <h1 className="font-[family-name:var(--font-inter)] text-2xl sm:text-3xl font-light" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
            <p className="mt-6 text-sky-200/60 text-sm">{dateLine}</p>
          </div>
        </HeroShell>
      );

    case "floral-garden":
      return (
        <HeroShell>
          <p className="text-rose-300/80 text-[10px] uppercase tracking-[0.45em] mb-4">{intro}</p>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-5xl sm:text-6xl" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <div className="flex justify-center gap-2 mt-6 text-rose-300/40 text-lg">✿ ✿ ✿</div>
          <p className="mt-6 text-sm opacity-70">{dateLine}</p>
        </HeroShell>
      );

    case "royal-emerald-wedding":
      return (
        <HeroShell>
          <p className="text-[10px] uppercase tracking-[0.5em] mb-4" style={{ color: secondary }}>♛ Royal Ceremony</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl uppercase tracking-[0.12em]" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <div className="h-px w-24 mx-auto my-6 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <p className="font-[family-name:var(--font-cormorant)] italic text-lg opacity-80">{intro}</p>
          <p className="mt-6 font-[family-name:var(--font-cinzel)] tracking-[0.3em] text-sm" style={{ color: secondary }}>{dateLine}</p>
        </HeroShell>
      );

    case "midnight-velvet-reception":
      return (
        <HeroShell className="max-w-xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="sm:w-1/2 sm:text-right">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl italic" style={{ color: primary }}>{name1}</h1>
            </div>
            <div className="hidden sm:block w-px h-24 bg-gradient-to-b from-transparent via-slate-400 to-transparent" />
            <div className="sm:w-1/2 sm:text-left">
              {name2 && <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl italic" style={{ color: primary }}>{name2}</h1>}
              <p className="mt-4 text-xs uppercase tracking-[0.35em] text-slate-400">{dateLine}</p>
            </div>
          </div>
          <p className="mt-8 text-[10px] uppercase tracking-[0.4em] text-indigo-300/60">{intro}</p>
        </HeroShell>
      );

    case "kente-heritage-union":
      return (
        <HeroShell>
          <div className="h-2 w-full max-w-xs mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-500 via-red-600 to-emerald-600" />
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl uppercase tracking-wider" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-4 text-amber-200/80 text-xs uppercase tracking-[0.4em]">{intro}</p>
          <div className="h-2 w-full max-w-xs mx-auto mt-6 rounded-full bg-gradient-to-r from-emerald-600 via-red-600 to-amber-500" />
          <p className="mt-6 text-sm">{dateLine}</p>
        </HeroShell>
      );

    case "floral-garden-romance":
      return (
        <HeroShell className="max-w-lg">
          <motion.h1
            className="font-[family-name:var(--font-great-vibes)] text-5xl sm:text-6xl leading-tight"
            style={{ color: primary }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {name1}
          </motion.h1>
          {name2 && <p className="text-2xl sm:text-3xl mt-3 font-[family-name:var(--font-great-vibes)] opacity-70">{name2}</p>}
          <p className="mt-8 text-xs uppercase tracking-[0.45em] text-rose-400/70">{intro}</p>
          <p className="mt-4 text-sm opacity-60">{dateLine}</p>
        </HeroShell>
      );

    case "passport-destination-wedding":
      return (
        <HeroShell>
          <div className="inline-flex items-center gap-3 border border-teal-400/40 rounded-full px-5 py-2 mb-6 bg-teal-950/40">
            <span className="text-teal-300 text-lg">✈</span>
            <span className="text-[10px] uppercase tracking-[0.4em] text-teal-200/80">Boarding Pass</span>
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl sm:text-2xl uppercase" style={{ color: primary }}>{name1} → {name2 || "Forever"}</h1>
          <p className="mt-6 font-mono text-sm text-teal-200/70">{dateLine} · GATE A</p>
        </HeroShell>
      );

    case "crystal-acrylic-luxury":
      return (
        <HeroShell>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-sky-400/20 via-white/10 to-amber-300/20 blur-xl rounded-full" />
            <h1 className="relative font-[family-name:var(--font-inter)] text-3xl sm:text-4xl font-extralight tracking-[0.2em] uppercase" style={{ color: primary }}>{name1}{name2 && <> · {name2}</>}</h1>
          </div>
          <p className="mt-8 text-[10px] uppercase tracking-[0.5em] text-sky-200/50">{intro}</p>
          <p className="mt-4 text-amber-200/70 text-sm">{dateLine}</p>
        </HeroShell>
      );

    case "golden-islamic-nikkah":
      return (
        <HeroShell>
          <div className="mx-auto w-48 h-12 mb-6 border-t-2 border-b-2 flex items-center justify-center" style={{ borderColor: secondary }}>
            <span className="text-2xl" style={{ color: secondary }}>☪</span>
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl tracking-wide" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-4 text-emerald-200/70 text-sm italic">{intro}</p>
          <p className="mt-6 text-xs uppercase tracking-[0.4em]" style={{ color: secondary }}>{dateLine}</p>
        </HeroShell>
      );

    case "memorial-candle-tribute":
      return (
        <HeroShell>
          <motion.div
            className="mx-auto w-3 h-16 rounded-full mb-6"
            style={{ background: `linear-gradient(180deg, ${secondary} 0%, transparent 100%)`, boxShadow: `0 0 30px ${secondary}66` }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <p className="text-[10px] uppercase tracking-[0.5em] text-stone-400 mb-4">In Loving Memory</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-light tracking-wider" style={{ color: primary }}>{name1}{name2 && <> · {name2}</>}</h1>
          <p className="mt-6 text-sm opacity-50">{dateLine}</p>
        </HeroShell>
      );

    case "neon-celebration-party":
      return (
        <HeroShell className="max-w-lg">
          <motion.h1
            className="font-display text-4xl sm:text-5xl font-black uppercase"
            style={{ color: secondary, textShadow: `0 0 30px ${secondary}, 0 0 60px ${colors.accent ?? "#38BDF8"}` }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {name1}
          </motion.h1>
          {name2 && <p className="text-fuchsia-300 text-2xl mt-4 font-bold">& {name2}</p>}
          <p className="mt-8 text-cyan-300 tracking-[0.4em] text-[10px] uppercase">{dateLine}</p>
        </HeroShell>
      );

    case "corporate-prestige-summit":
      return (
        <HeroShell className="max-w-2xl text-left sm:px-12">
          <p className="text-[10px] uppercase tracking-[0.45em] text-teal-400/80 mb-3">Official Invitation</p>
          <h1 className="font-[family-name:var(--font-inter)] text-2xl sm:text-3xl font-semibold leading-snug" style={{ color: primary }}>{name1}{name2 && `: ${name2}`}</h1>
          <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-widest text-slate-400">
            <span>{dateLine}</span>
            <span>{time}</span>
          </div>
          <div className="mt-8 h-1 w-16 rounded-full" style={{ background: colors.accent ?? "#0B8A83" }} />
        </HeroShell>
      );

    default:
      return (
        <HeroShell>
          <p className="uppercase tracking-[0.4em] text-xs opacity-70 mb-6" style={{ color: secondary }}>{intro}</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl uppercase" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-8 text-sm" style={{ color: secondary }}>{dateLine}</p>
        </HeroShell>
      );
  }
}
