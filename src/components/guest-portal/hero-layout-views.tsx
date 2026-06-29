"use client";

import { motion } from "framer-motion";
import type { HeroLayoutId } from "@/lib/experience/experience-types";

export interface HeroLayoutViewProps {
  layoutId: HeroLayoutId;
  name1: string;
  name2: string;
  intro: string;
  dateLine: string;
  time: string;
  colors?: { primary?: string; secondary?: string; text?: string };
  fonts?: { body?: string; heading?: string; script?: string };
}

export function HeroLayoutView({
  layoutId,
  name1,
  name2,
  intro,
  dateLine,
  time,
  colors,
  fonts,
}: HeroLayoutViewProps) {
  const primary = colors?.primary ?? "#F5F0E6";
  const secondary = colors?.secondary ?? "#D4A63A";
  const rootClass = "inv-text-on-dark inv-phrase-emphasis";

  switch (layoutId) {
    case "vine-arch":
      return (
        <div className={`text-center px-8 max-w-md mx-auto ${rootClass}`}>
          <div className="mx-auto w-48 h-56 border-t-[3px] border-x-[3px] border-emerald-400/60 rounded-t-[999px] flex flex-col items-center justify-end pb-8 mb-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/80">{intro}</p>
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl uppercase tracking-wider" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-4 text-emerald-200/70 text-sm">{dateLine}</p>
        </div>
      );

    case "lace-frame":
      return (
        <div className="relative px-10 py-12 max-w-md mx-auto text-center">
          <div className="absolute inset-4 border border-dashed border-amber-100/30 rounded-sm pointer-events-none" />
          <div className="absolute inset-2 border border-amber-100/15 pointer-events-none" />
          <p className="text-xs italic opacity-80 mb-6 font-[family-name:var(--font-cormorant)]">{intro}</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-xl mt-2 opacity-90">& {name2}</p>}
          <p className="mt-8 text-sm tracking-widest uppercase opacity-70">{dateLine}</p>
        </div>
      );

    case "hexagon-stack":
      return (
        <div className="text-center px-6 max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rotate-45 border-2 border-rose-300/50 bg-rose-50/10">
            <span className="-rotate-45 text-rose-200 text-xs uppercase tracking-widest">RSVP</span>
          </div>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-5xl sm:text-6xl" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-2xl mt-2 opacity-80 font-[family-name:var(--font-great-vibes)]">{name2}</p>}
          <p className="mt-8 text-xs uppercase tracking-[0.45em] opacity-60">{dateLine}</p>
        </div>
      );

    case "rings-spotlight":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="flex justify-center gap-[-8px] mb-8">
            <div className="w-14 h-14 rounded-full border-2 border-amber-400/80 -mr-3" />
            <div className="w-14 h-14 rounded-full border-2 border-amber-400/80" />
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl uppercase tracking-[0.2em]" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-amber-300 mt-3 tracking-widest uppercase text-sm">{name2}</p>}
          <p className="mt-8 text-xs opacity-50 uppercase tracking-[0.35em]">{intro}</p>
          <p className="mt-4 font-[family-name:var(--font-cinzel)]" style={{ color: secondary }}>{dateLine}</p>
        </div>
      );

    case "media-canvas":
      return (
        <div className="text-left px-8 max-w-xl mx-auto w-full">
          <p className="text-xs uppercase tracking-[0.5em] mb-4 opacity-50">{intro}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-none" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-2xl mt-3 font-light opacity-80">{name2}</p>}
          <div className="mt-10 inline-block border-l-4 pl-4" style={{ borderColor: secondary }}>
            <p className="text-sm font-medium">{dateLine}</p>
            <p className="text-xs opacity-60 mt-1">{time}</p>
          </div>
        </div>
      );

    case "glass-frost":
      return (
        <div className="text-center px-8 max-w-md mx-auto rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl py-10 shadow-[0_8px_32px_rgba(56,189,248,0.15)]">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-200/80 mb-6">{intro}</p>
          <h1 className="font-[family-name:var(--font-inter)] text-2xl font-light tracking-wide" style={{ color: primary }}>{name1}{name2 && <> · {name2}</>}</h1>
          <div className="mt-8 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-sky-300/50 to-transparent" />
          <p className="mt-6 text-sky-100/80 text-sm">{dateLine}</p>
        </div>
      );

    case "garden-card":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <p className="font-[family-name:var(--font-great-vibes)] text-3xl mb-2" style={{ color: secondary }}>{intro}</p>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-5xl sm:text-6xl leading-tight" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-3xl mt-2 font-[family-name:var(--font-great-vibes)] opacity-90">{name2}</p>}
          <p className="mt-8 text-rose-300/80 text-sm tracking-wide">{dateLine} · {time}</p>
        </div>
      );

    case "royal-palace":
      return (
        <div className="text-center px-8 max-w-lg mx-auto">
          <div className="mx-auto w-16 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-6" />
          <p className="text-[10px] uppercase tracking-[0.5em] text-emerald-200/70 mb-4">{intro}</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl uppercase tracking-[0.15em] leading-snug" style={{ color: primary }}>
            {name1}{name2 && (<><span className="block my-2 text-amber-400 text-lg">♛</span>{name2}</>)}
          </h1>
          <p className="mt-8 font-[family-name:var(--font-cinzel)] tracking-[0.35em] text-sm text-amber-300">{dateLine}</p>
        </div>
      );

    case "velvet-stage":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="flex justify-center gap-1 mb-8 opacity-80">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 h-8 bg-gradient-to-b from-slate-300/60 to-transparent rounded-full" style={{ transform: `scaleY(${1 - i * 0.12})` }} />
            ))}
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl italic font-light" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-6 text-xs uppercase tracking-[0.4em] text-slate-300/60">{intro}</p>
          <p className="mt-6 text-champagne-200/90 text-sm tracking-widest">{dateLine}</p>
        </div>
      );

    case "kente-weave":
      return (
        <div className="text-center px-6 max-w-md mx-auto">
          <div className="h-2 mb-8 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl uppercase" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-amber-300 mt-3 text-lg">& {name2}</p>}
          <p className="mt-6 text-xs uppercase tracking-[0.35em] opacity-70">{intro}</p>
          <div className="h-2 mt-8 rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-red-600" />
          <p className="mt-6 text-sm text-amber-100/80">{dateLine}</p>
        </div>
      );

    case "garden-bloom":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <motion.div className="text-4xl mb-4" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }}>✿</motion.div>
          <h1 className="font-[family-name:var(--font-great-vibes)] text-5xl" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-3xl mt-1 font-[family-name:var(--font-great-vibes)] text-rose-400">{name2}</p>}
          <p className="mt-8 text-sm text-emerald-800/70 dark:text-emerald-200/70">{dateLine}</p>
        </div>
      );

    case "boarding-pass":
      return (
        <div className="max-w-sm mx-auto px-4">
          <div className="rounded-xl border-2 border-dashed border-teal-400/50 bg-teal-950/50 p-6 text-left relative">
            <div className="absolute -right-3 top-1/2 w-6 h-6 rounded-full bg-black/80 -translate-y-1/2" />
            <div className="absolute -left-3 top-1/2 w-6 h-6 rounded-full bg-black/80 -translate-y-1/2" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-teal-300/80">Boarding Pass</p>
            <h1 className="font-[family-name:var(--font-cinzel)] text-xl mt-3 uppercase" style={{ color: primary }}>{name1}{name2 && ` / ${name2}`}</h1>
            <div className="flex justify-between mt-6 text-xs opacity-80">
              <span>DATE<br /><strong>{dateLine}</strong></span>
              <span>TIME<br /><strong>{time}</strong></span>
            </div>
          </div>
        </div>
      );

    case "crystal-prism":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="mx-auto w-24 h-24 mb-6 rotate-45 border border-sky-200/30 bg-gradient-to-br from-white/20 to-sky-200/10 backdrop-blur-md shadow-[0_0_40px_rgba(56,189,248,0.25)]" />
          <h1 className="font-[family-name:var(--font-inter)] text-2xl font-semibold tracking-tight" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-sky-300/90 mt-2">{name2}</p>}
          <p className="mt-8 text-xs uppercase tracking-[0.45em] text-sky-200/60">{dateLine}</p>
        </div>
      );

    case "islamic-arch":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="mx-auto w-40 h-24 border-t-2 border-x-2 border-amber-400/50 rounded-t-full mb-6 flex items-end justify-center pb-2">
            <span className="text-amber-400 text-lg">☪</span>
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl uppercase tracking-wider" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          <p className="mt-6 text-emerald-200/70 text-sm">{intro}</p>
          <p className="mt-4 text-amber-300/90 text-sm tracking-widest">{dateLine}</p>
        </div>
      );

    case "memorial-candle":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <motion.div className="mx-auto w-3 h-16 bg-gradient-to-t from-amber-600/80 to-amber-200/90 rounded-full mb-2 shadow-[0_0_20px_rgba(251,191,36,0.4)]" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }} />
          <div className="w-8 h-8 mx-auto rounded-full bg-amber-400/30 blur-md mb-8" />
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl uppercase tracking-[0.25em] font-light" style={{ color: primary }}>{name1}</h1>
          <p className="mt-6 text-xs uppercase tracking-[0.4em] opacity-50">{intro}</p>
          <p className="mt-4 text-sm opacity-60">{dateLine}</p>
        </div>
      );

    case "corporate-grid":
      return (
        <div className="text-left px-8 max-w-xl mx-auto w-full">
          <div className="grid grid-cols-4 gap-1 mb-8 opacity-30">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-1 bg-teal-400 rounded" />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-teal-400/80 mb-3">{intro}</p>
          <h1 className="font-[family-name:var(--font-inter)] text-3xl sm:text-4xl font-bold tracking-tight uppercase" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-teal-300/80 mt-2 text-sm font-medium">{name2}</p>}
          <p className="mt-8 text-sm font-mono opacity-70">{dateLine} · {time}</p>
        </div>
      );

    case "editorial-split":
      return (
        <div className="flex flex-col sm:flex-row items-center gap-8 px-8 max-w-2xl mx-auto">
          <div className="sm:w-1/2 text-center sm:text-left">
            <p className="uppercase tracking-[0.35em] text-xs opacity-70 mb-4" style={{ color: secondary, fontFamily: fonts?.body }}>{intro}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight" style={{ color: primary }}>{name1}{name2 && <> & {name2}</>}</h1>
          </div>
          <div className="sm:w-1/2 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-6 sm:pt-0 sm:pl-8">
            <p className="font-[family-name:var(--font-cinzel)] tracking-[0.3em] text-sm" style={{ color: secondary }}>{dateLine}</p>
            <p className="mt-2 text-sm opacity-60">{time}</p>
          </div>
        </div>
      );

    case "neon-pulse":
      return (
        <div className="text-center px-8 max-w-lg mx-auto">
          <motion.h1 className="font-display text-4xl sm:text-5xl font-black uppercase" style={{ color: secondary, textShadow: `0 0 30px ${secondary}` }}
            animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 2, repeat: Infinity }}>
            {name1}
          </motion.h1>
          {name2 && <p className="text-fuchsia-300 text-2xl mt-4 font-bold">& {name2}</p>}
          <p className="mt-8 text-cyan-300 tracking-[0.4em] text-xs uppercase">{dateLine}</p>
        </div>
      );

    case "passport-stamp":
      return (
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="inline-block border-2 border-dashed border-amber-400/60 rounded-lg px-6 py-4 rotate-[-2deg] mb-6 bg-amber-950/40">
            <p className="text-amber-300 text-xs uppercase tracking-[0.5em]">Official Invite</p>
          </div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl uppercase tracking-wider" style={{ color: primary }}>{name1}{name2 && <> · {name2}</>}</h1>
          <p className="mt-6 text-amber-200/80 text-sm">{dateLine} · {time}</p>
        </div>
      );

    case "fullscreen-type":
      return (
        <div className="text-center px-6 max-w-3xl mx-auto">
          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tight" style={{ color: primary }}>
            {name1}
            {name2 && <span className="block text-3xl sm:text-4xl mt-4 opacity-70 font-light">{name2}</span>}
          </h1>
          <p className="mt-10 text-xs uppercase tracking-[0.5em] opacity-50">{intro}</p>
          <p className="mt-4 font-[family-name:var(--font-cinzel)] text-lg" style={{ color: secondary }}>{dateLine}</p>
        </div>
      );

    case "magazine-stack":
      return (
        <div className="text-left px-8 max-w-md mx-auto">
          <p className="text-[10px] uppercase tracking-[0.5em] opacity-50 mb-2">Feature</p>
          <h1 className="font-display text-4xl font-black uppercase leading-[0.9]" style={{ color: primary }}>{name1}</h1>
          {name2 && <p className="text-2xl font-light mt-2 opacity-80">{name2}</p>}
          <div className="mt-8 pt-4 border-t border-white/20">
            <p className="text-xs uppercase tracking-widest opacity-60">{dateLine}</p>
            <p className="text-sm mt-1 opacity-50">{time}</p>
          </div>
        </div>
      );

    case "classic-centered":
    default:
      return (
        <div className={`flex flex-col items-center justify-center text-center px-8 max-w-lg mx-auto ${rootClass}`}>
          <p className="uppercase tracking-[0.4em] text-xs opacity-70 mb-6" style={{ color: secondary, fontFamily: fonts?.body }}>{intro}</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl md:text-5xl uppercase tracking-[0.08em] leading-tight" style={{ color: primary }}>
            {name1}
            {name2 && (<><span className="block my-3 text-lg opacity-50">&</span>{name2}</>)}
          </h1>
          <p className="mt-8 font-[family-name:var(--font-cinzel)] tracking-[0.3em] text-sm sm:text-base" style={{ color: secondary }}>{dateLine}</p>
          <p className="mt-2 text-sm opacity-60">{time}</p>
        </div>
      );
  }
}
