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
  return cn("transition-all duration-300 touch-manipulation min-h-[44px]", invitationButtonClass(style, variant), extra);
}
