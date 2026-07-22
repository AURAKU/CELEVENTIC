import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { cn } from "@/lib/utils";

export const EXTENDED_BUTTON_STYLES: { id: ButtonStyle | string; label: string; className: string }[] = [
  { id: "gold", label: "Gold luxury pill", className: "rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-semibold shadow-lg shadow-amber-900/30 hover:brightness-110" },
  { id: "glass", label: "Glassmorphism", className: "rounded-xl bg-white/15 backdrop-blur-md border border-white/25 text-white hover:bg-white/25" },
  { id: "pill", label: "Floating pill", className: "rounded-full bg-white/90 text-slate-900 shadow-lg hover:bg-white" },
  { id: "outline", label: "Outline royal", className: "rounded-lg border-2 border-current bg-transparent hover:bg-white/10" },
  { id: "rounded", label: "Soft shadow rounded", className: "rounded-xl shadow-md hover:shadow-lg" },
  { id: "sharp", label: "Minimal professional", className: "rounded-sm uppercase tracking-wider text-xs font-semibold" },
  { id: "wax-seal", label: "Wax seal", className: "rounded-full border-4 border-amber-700/80 bg-gradient-to-br from-red-900 to-amber-900 text-amber-100 font-serif" },
  { id: "neon", label: "Neon glow", className: "rounded-full border border-fuchsia-400 text-fuchsia-200 shadow-[0_0_20px_rgba(232,121,249,0.45)] hover:shadow-[0_0_28px_rgba(232,121,249,0.65)]" },
  { id: "kente", label: "Kente pattern", className: "rounded-lg bg-gradient-to-r from-amber-600 via-red-700 to-emerald-700 text-white font-semibold" },
  { id: "floral-edge", label: "Floral edge", className: "rounded-2xl border-2 border-rose-300/60 bg-rose-50/90 text-rose-950" },
  { id: "passport-stamp", label: "Passport stamp", className: "rounded-md border-2 border-dashed border-amber-800/70 bg-amber-50/90 text-amber-950 font-mono uppercase tracking-widest text-xs rotate-[-2deg]" },
  { id: "solemn", label: "Solemn outline", className: "rounded-md border border-amber-200/40 text-amber-50/90 bg-black/20" },
  { id: "embossed-royal", label: "Royal embossed", className: "rounded-lg bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950 font-serif font-semibold border border-amber-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(120,80,10,0.35)] hover:brightness-105" },
  { id: "ticket-stub", label: "Ticket stub", className: "rounded-sm bg-orange-50 text-orange-950 border-x-4 border-dotted border-orange-400 font-mono uppercase tracking-wider text-xs shadow-md hover:bg-orange-100" },
  { id: "ribbon", label: "Ribbon", className: "rounded-none bg-rose-700 text-rose-50 font-semibold [clip-path:polygon(4%_0,96%_0,100%_50%,96%_100%,4%_100%,0_50%)] px-8 hover:bg-rose-600" },
  { id: "editorial-underline", label: "Editorial underline", className: "rounded-none bg-transparent border-b-2 border-current font-serif italic tracking-wide hover:opacity-75" },
  { id: "metallic", label: "Metallic silver", className: "rounded-lg bg-gradient-to-b from-slate-200 via-slate-50 to-slate-300 text-slate-900 font-semibold border border-slate-400/60 shadow-md hover:brightness-105" },
  { id: "paper-tab", label: "Paper tab", className: "rounded-t-xl rounded-b-none bg-amber-50 text-stone-800 border border-b-0 border-stone-300 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] font-medium hover:bg-amber-100" },
  { id: "crystal", label: "Crystal facet", className: "rounded-xl bg-gradient-to-br from-cyan-100/30 via-white/20 to-sky-200/30 backdrop-blur-md border border-white/50 text-white shadow-[0_0_18px_rgba(125,211,252,0.35)] hover:shadow-[0_0_26px_rgba(125,211,252,0.55)]" },
  { id: "minimal-text", label: "Minimal text", className: "rounded-none bg-transparent uppercase tracking-[0.3em] text-xs font-medium hover:tracking-[0.36em]" },
  { id: "gradient-cta", label: "Cinematic gradient", className: "rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white font-semibold shadow-lg shadow-fuchsia-900/30 hover:brightness-110" },
  { id: "corporate-solid", label: "Corporate solid", className: "rounded-md bg-slate-900 text-white font-semibold tracking-wide border border-slate-700 hover:bg-slate-800" },
  { id: "pearl", label: "Pearl", className: "rounded-full bg-gradient-to-b from-rose-50 via-white to-stone-100 text-stone-800 font-medium border border-rose-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(244,114,182,0.15)] hover:brightness-105" },
  { id: "ornamental-arch", label: "Ornamental arch", className: "rounded-t-full rounded-b-lg bg-emerald-950 text-amber-100 font-serif border border-amber-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] hover:bg-emerald-900" },
];

export function invitationButtonClass(style: ButtonStyle | string | undefined, variant: "light" | "dark" = "dark"): string {
  const found = EXTENDED_BUTTON_STYLES.find((s) => s.id === style);
  if (found) return found.className;
  if (style === "outline") return variant === "dark" ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300";
  return variant === "dark" ? "bg-white/10 text-white border-white/20" : "";
}

export function styledInvitationButton(
  style: ButtonStyle | string | undefined,
  variant: "light" | "dark" = "dark",
  extra?: string
): string {
  return cn(
    "transition-all duration-300 touch-manipulation min-h-[44px] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    invitationButtonClass(style, variant),
    extra
  );
}
